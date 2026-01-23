import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
from typing import List, Optional, Literal
import time
from contextlib import asynccontextmanager

# RECOMMENDED: Upgrade to 6.7B model for much better app generation quality
# Your GPU (Tesla T4, 16GB) can handle it perfectly!
MODEL_ID = "deepseek-ai/deepseek-coder-6.7b-instruct"  # Upgraded from 1.3B

# Global model loading
tokenizer = None
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model
    global tokenizer, model
    print("Loading model...")
    print(f"Model: {MODEL_ID}")
    print("This may take 2-5 minutes for 6.7B model...")
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        dtype=torch.float16,  # Fixed: use dtype instead of torch_dtype
        device_map="auto",
    )
    model.eval()  # Set to evaluation mode
    print("Model loaded successfully!")
    print(f"GPU Memory Used: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    yield
    # Shutdown: Cleanup
    del model
    del tokenizer
    torch.cuda.empty_cache()

app = FastAPI(title="DeepSeek Coder API", lifespan=lifespan)

# Legacy endpoint (keep for backward compatibility)
class Prompt(BaseModel):
    prompt: str
    max_tokens: int = 4000  # Increased from 256 for app generation

@app.post("/generate")
def generate_code(data: Prompt):
    """Legacy endpoint - kept for backward compatibility"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    inputs = tokenizer(data.prompt, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=data.max_tokens,
            temperature=0.7,  # Increased from 0.2 for better creativity
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1,  # Reduce repetition
            no_repeat_ngram_size=3,  # Prevent 3-gram repetition
        )
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"output": result}

# OpenAI-compatible models
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatCompletionRequest(BaseModel):
    model: str = "deepseek-coder"
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: Optional[int] = 4000
    stream: bool = False

class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str = "stop"

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible endpoint optimized for app generation"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Build prompt from messages (optimized for code generation)
    prompt_parts = []
    system_instruction = ""
    
    for msg in request.messages:
        if msg.role == "system":
            system_instruction = msg.content
        elif msg.role == "user":
            prompt_parts.append(f"### User Request:\n{msg.content}")
        elif msg.role == "assistant":
            prompt_parts.append(f"### Assistant Response:\n{msg.content}")
    
    # Optimized prompt format for code generation
    if system_instruction:
        full_prompt = f"### System Instructions:\n{system_instruction}\n\n" + "\n".join(prompt_parts) + "\n### Assistant Response:\n"
    else:
        full_prompt = "\n".join(prompt_parts) + "\n### Assistant Response:\n"
    
    # Tokenize with truncation if needed
    # 6.7B model supports 16K context, 1.3B supports 2K
    max_context = 16384 if "6.7b" in MODEL_ID.lower() else 2048
    
    inputs = tokenizer(
        full_prompt, 
        return_tensors="pt",
        truncation=True,
        max_length=max_context,
        return_overflowing_tokens=False
    ).to("cuda")
    
    input_length = inputs.input_ids.shape[1]
    max_new_tokens = min(request.max_tokens or 4000, 4000)  # Cap at 4000
    
    # Optimized generation parameters for app creation
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=request.temperature,
            top_p=0.95,
            top_k=50,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1,  # Reduce repetition
            no_repeat_ngram_size=3,  # Prevent 3-gram repetition
        )
    
    # Decode only the new tokens
    generated_tokens = outputs[0][input_length:]
    response_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    
    # Calculate usage
    total_tokens = outputs.shape[1]
    prompt_tokens = input_length
    completion_tokens = total_tokens - input_length
    
    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": request.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": response_text
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens
        }
    }

@app.get("/v1/models")
def list_models():
    """List available models (OpenAI-compatible)"""
    return {
        "object": "list",
        "data": [{
            "id": "deepseek-coder",
            "object": "model",
            "created": int(time.time()),
            "owned_by": "deepseek"
        }]
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    gpu_memory = torch.cuda.memory_allocated() / 1024**3 if torch.cuda.is_available() else 0
    return {
        "status": "healthy",
        "model": MODEL_ID,
        "gpu_memory_gb": round(gpu_memory, 2),
        "model_loaded": model is not None,
        "gpu_available": torch.cuda.is_available()
    }
