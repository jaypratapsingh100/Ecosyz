'use client';

import { useState, useRef, useEffect } from 'react';
import { generateBuildPromptFromQuestionnaire } from '@/app/lib/utils/buildPrompt';
import type { QuestionnaireData } from '@/app/types/app-builder';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractingFiles?: boolean;
}

interface AppChatProps {
  projectId: string;
  currentFile?: { id: string; path: string; name: string };
  projectFiles?: Array<{ path: string; name: string }>;
  onFilesCreated?: () => void;
  startWizardMode?: boolean;
  projectTitle?: string;
}

interface WizardQuestion {
  key: keyof QuestionnaireData | 'appDescription';
  question: string;
  placeholder?: string;
  type: 'text' | 'select' | 'multi-select';
  options?: string[];
  required: boolean;
}

const WIZARD_QUESTIONS: WizardQuestion[] = [
  { key: 'appDescription', question: "Let's start! What kind of app or website do you want to build? Describe your idea in a few sentences.", type: 'text', required: true },
  { key: 'appType', question: "What type of app is this? (e.g., Portfolio, Business Website, E-commerce, SaaS, Blog, Landing Page, or Other)", type: 'text', required: true },
  { key: 'targetAudience', question: "Who is your target audience? (e.g., General Public, Businesses, Consumers, Developers, Students)", type: 'text', required: true },
  { key: 'brandName', question: "What's your brand or project name?", type: 'text', required: false },
  { key: 'tagline', question: "Do you have a tagline or short description?", type: 'text', required: false },
  { key: 'designStyle', question: "What design style do you prefer? (Modern & Minimal, Bold & Colorful, Professional & Corporate, Creative & Artistic, or Clean & Simple)", type: 'text', required: true },
  { key: 'colorScheme', question: "What color scheme do you want? (Professional Blue, Energetic Orange/Red, Calm Green/Teal, Elegant Purple, Neutral Gray/Black, or let AI choose)", type: 'text', required: false },
  { key: 'layoutStyle', question: "What layout style? (Single Page Scroll, Multi-page Navigation, Dashboard/App Layout, Blog Layout, or Landing Page)", type: 'text', required: true },
  { key: 'requiredSections', question: "What sections do you need? (e.g., Hero, About, Portfolio, Services, Contact, Blog, Testimonials, Pricing, FAQ, Team - separate with commas)", type: 'text', required: true },
  { key: 'specialFeatures', question: "Any special features? (e.g., Contact Form, Newsletter, Social Links, Gallery, Video, Maps, Chat Widget - separate with commas)", type: 'text', required: false },
];

export default function AppChat({ projectId, currentFile, projectFiles = [], onFilesCreated, startWizardMode = false, projectTitle = 'My App' }: AppChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [wizardMode, setWizardMode] = useState(startWizardMode);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<Partial<QuestionnaireData & { appDescription: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync wizard mode with prop
  useEffect(() => {
    if (startWizardMode && !wizardMode) {
      setWizardMode(true);
      setWizardStep(0);
      setWizardAnswers({});
    } else if (!startWizardMode && wizardMode) {
      setWizardMode(false);
    }
  }, [startWizardMode, wizardMode]);

  // Initialize wizard mode
  useEffect(() => {
    if (wizardMode && wizardStep === 0 && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'wizard-welcome',
        role: 'assistant',
        content: `🎨 **Welcome to the Project Wizard!**\n\nI'll ask you a few questions to understand what you want to build. Let's get started!\n\n**Question 1 of ${WIZARD_QUESTIONS.length}:**\n\n${WIZARD_QUESTIONS[0].question}`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setIsLoadingHistory(false);
    }
  }, [wizardMode, wizardStep, messages.length]);

  // Load chat history from database on mount (skip if wizard mode)
  useEffect(() => {
    if (wizardMode && wizardStep === 0 && messages.length > 0) return; // Don't load history in wizard mode
    
    const loadChatHistory = async () => {
      if (!projectId) return;
      
      try {
        setIsLoadingHistory(true);
        const response = await fetch(`/api/app-projects/${projectId}/chat`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            // Convert database messages to component format
            const loadedMessages: Message[] = data.messages.map((msg: any, idx: number) => ({
              id: msg.id || `loaded-${idx}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }));
            
            setMessages(loadedMessages);
            console.log('✅ Loaded chat history:', loadedMessages.length, 'messages');
          } else {
            // Default message if no history
            const defaultMessage: Message = {
              id: '1',
              role: 'assistant',
              content: "Hello! I'm your AI Code Assistant powered by **Azure DeepSeek**. I can help you generate, modify, and explain professional, production-ready code.\n\nWhat would you like to build?",
              timestamp: new Date(),
            };
            setMessages([defaultMessage]);
          }
        } else {
          console.warn('⚠️ Failed to load chat history:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [projectId, wizardMode, wizardStep, messages.length]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesContainerRef.current && messagesEndRef.current) {
      // Scroll container to bottom smoothly
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check for auto-generated prompt from questionnaire
  useEffect(() => {
    const checkAutoPrompt = () => {
      const autoPrompt = sessionStorage.getItem(`auto-prompt-${projectId}`);
      const autoPromptTimestamp = sessionStorage.getItem(`auto-prompt-timestamp-${projectId}`);
      const autoResponse = sessionStorage.getItem(`auto-response-${projectId}`);
      const autoError = sessionStorage.getItem(`auto-error-${projectId}`);
      
      if (autoPrompt && autoPromptTimestamp) {
        // Check if this is a recent prompt (within last 30 seconds)
        const timestamp = parseInt(autoPromptTimestamp);
        const now = Date.now();
        if (now - timestamp < 30000) {
          // Add user message with prompt
          const userMessage: Message = {
            id: `auto-prompt-${timestamp}`,
            role: 'user',
            content: autoPrompt,
            timestamp: new Date(timestamp),
          };
          
          setMessages((prev) => {
            // Check if already added
            if (prev.some(m => m.id === userMessage.id)) {
              return prev;
            }
            return [...prev, userMessage];
          });
          
          // Add AI response if available
          if (autoResponse) {
            try {
              const responseData = JSON.parse(autoResponse);
              let responseContent = responseData.response || 'Files are being generated...';
              
              
              const assistantMessage: Message = {
                id: `auto-response-${timestamp}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
              };
              
              setMessages((prev) => {
                if (prev.some(m => m.id === assistantMessage.id)) {
                  return prev;
                }
                return [...prev, assistantMessage];
              });
              
              // Trigger files refresh
              if (onFilesCreated) {
                setTimeout(() => {
                  onFilesCreated();
                }, 2000);
              }
              
              // Clear sessionStorage
              sessionStorage.removeItem(`auto-prompt-${projectId}`);
              sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
              sessionStorage.removeItem(`auto-response-${projectId}`);
            } catch (e) {
              console.error('Error parsing auto-response:', e);
            }
          } else if (autoError) {
            // Show error message
            try {
              const errorData = JSON.parse(autoError);
              let errorContent = `❌ Error: ${errorData.error || 'Failed to generate files'}`;
              
              // Add more helpful error details if available
              if (errorData.details) {
                if (typeof errorData.details === 'string') {
                  errorContent += `\n\nDetails: ${errorData.details}`;
                } else if (errorData.details.error) {
                  errorContent += `\n\nDetails: ${errorData.details.error}`;
                }
              }
              
              if (errorData.suggestion) {
                errorContent += `\n\n💡 ${errorData.suggestion}`;
              } else {
                errorContent += `\n\n💡 Please check your API key settings (⚙️ icon) and try asking the AI manually to create your app.`;
              }
              
              const errorMessage: Message = {
                id: `auto-error-${timestamp}`,
                role: 'assistant',
                content: errorContent,
                timestamp: new Date(),
              };
              
              setMessages((prev) => {
                if (prev.some(m => m.id === errorMessage.id)) {
                  return prev;
                }
                return [...prev, errorMessage];
              });
              
              sessionStorage.removeItem(`auto-error-${projectId}`);
            } catch (e) {
              console.error('Error parsing auto-error:', e);
            }
          }
        }
      } else {
        // Old prompt, clear it
        sessionStorage.removeItem(`auto-prompt-${projectId}`);
        sessionStorage.removeItem(`auto-prompt-timestamp-${projectId}`);
      }
    };
    
    // Check immediately when component mounts or projectId changes
    checkAutoPrompt();
    
    // Also listen for auto-prompt-ready event in case prompt is set after component mounts
    const handleAutoPromptReady = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        // Small delay to ensure sessionStorage is set
        setTimeout(() => {
          checkAutoPrompt();
        }, 100);
      }
    };
    
    window.addEventListener('auto-prompt-ready', handleAutoPromptReady as EventListener);
    
    return () => {
      window.removeEventListener('auto-prompt-ready', handleAutoPromptReady as EventListener);
    };
  }, [projectId, onFilesCreated]);

  const handleExtractFiles = async (text: string, messageId: string) => {
    if (!projectId || !text) return;

    // Update message state to show loading
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, extractingFiles: true } : msg
      )
    );

    try {
      console.log('📤 Extracting files from message:', messageId);
      const response = await fetch(`/api/app-projects/${projectId}/extract-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract files: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Files extracted:', data);

      // Refresh file list immediately
      if (onFilesCreated) {
        onFilesCreated();
      }

      // Dispatch events
      window.dispatchEvent(new CustomEvent('files-updated', {
        detail: { projectId, filesCreated: data.filesCreated?.map((f: any) => f.path) || [] }
      }));
      window.dispatchEvent(new CustomEvent('preview-updated', { detail: { projectId } }));

      // Show success message with details
      const successfulFiles = data.filesCreated?.filter((f: any) => f.success) || [];
      const failedFiles = data.filesCreated?.filter((f: any) => !f.success) || [];
      
      let successContent = `✅ **Files Extracted Successfully!**\n\n`;
      if (successfulFiles.length > 0) {
        successContent += `Created ${successfulFiles.length} file(s):\n${successfulFiles.map((f: any) => `- \`${f.path}\` ✓`).join('\n')}\n\n`;
      }
      if (failedFiles.length > 0) {
        successContent += `⚠️ Failed to create ${failedFiles.length} file(s):\n${failedFiles.map((f: any) => `- \`${f.path}\`: ${f.error || 'Unknown error'}`).join('\n')}\n\n`;
      }
      successContent += `Files are now available in the Files panel. Click the refresh button (↻) if they don't appear.`;

      const successMessage: Message = {
        id: `extract-${Date.now()}`,
        role: 'assistant',
        content: successContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error: any) {
      console.error('❌ Error extracting files:', error);
      const errorMessage: Message = {
        id: `extract-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Failed to extract files**\n\nError: ${error.message}\n\nPlease check the code format and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Remove loading state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, extractingFiles: false } : msg
        )
      );
    }
  };

  // Process wizard answer and move to next question
  const processWizardAnswer = (answer: string) => {
    const currentQuestion = WIZARD_QUESTIONS[wizardStep];
    if (!currentQuestion) return;

    // Save answer
    const newAnswers = { ...wizardAnswers };
    
    // Handle special cases
    if (currentQuestion.key === 'requiredSections' || currentQuestion.key === 'specialFeatures') {
      // Split comma-separated values
      newAnswers[currentQuestion.key] = answer.split(',').map(s => s.trim()).filter(s => s.length > 0) as any;
    } else {
      (newAnswers as any)[currentQuestion.key] = answer;
    }
    
    setWizardAnswers(newAnswers);

    // Check if this is the last question
    if (wizardStep < WIZARD_QUESTIONS.length - 1) {
      // Move to next question
      const nextStep = wizardStep + 1;
      setWizardStep(nextStep);
      
      const nextQuestion = WIZARD_QUESTIONS[nextStep];
      const nextMessage: Message = {
        id: `wizard-q-${nextStep}`,
        role: 'assistant',
        content: `✅ Got it!\n\n**Question ${nextStep + 1} of ${WIZARD_QUESTIONS.length}:**\n\n${nextQuestion.question}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, nextMessage]);
      setIsLoading(false);
    } else {
      // All questions answered - build prompt and send
      buildAndSendWizardPrompt(newAnswers);
    }
  };

  // Build prompt from wizard answers and send it
  const buildAndSendWizardPrompt = async (answers: Partial<QuestionnaireData & { appDescription: string }>) => {
    setIsLoading(true);
    
    // Convert answers to QuestionnaireData format
    const questionnaireData: QuestionnaireData = {
      appType: answers.appType || 'web app',
      mainPurpose: answers.appDescription || '',
      targetAudience: answers.targetAudience || 'general',
      technicalLevel: 'intermediate',
      designStyle: answers.designStyle || 'modern-minimal',
      colorScheme: answers.colorScheme || 'auto',
      layoutStyle: answers.layoutStyle || 'single-page',
      requiredSections: Array.isArray(answers.requiredSections) ? answers.requiredSections : [],
      specialFeatures: Array.isArray(answers.specialFeatures) ? answers.specialFeatures : [],
      contentReady: 'yes',
      brandName: answers.brandName || projectTitle,
      tagline: answers.tagline || '',
      keyPoints: answers.appDescription || '',
      frameworkPreference: 'react',
      mobileResponsiveness: 'essential',
      performancePriority: 'balanced',
    };

    // Generate prompt
    const prompt = generateBuildPromptFromQuestionnaire(questionnaireData, answers.brandName || projectTitle);
    
    // Show completion message
    const completionMessage: Message = {
      id: 'wizard-complete',
      role: 'assistant',
      content: `🎉 **Perfect! I have all the information I need.**\n\nBuilding your project now...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, completionMessage]);
    
    // Exit wizard mode
    setWizardMode(false);
    setWizardStep(0);
    setWizardAnswers({});
    
    // Send the prompt as a user message
    const promptMessage: Message = {
      id: `wizard-prompt-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    
    // Update messages and get the latest for conversation history
    let updatedMessages: Message[] = [];
    setMessages((prev) => {
      updatedMessages = [...prev, promptMessage];
      return updatedMessages;
    });
    
    // Now send to chat API
    try {
      const requestBody: any = {
        message: prompt,
        currentFile: currentFile?.path,
        conversationHistory: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      const response = await fetch(`/api/app-projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        let responseContent = data.response || 'Files are being generated...';
        
        if (data.filesCreated && data.filesCreated.length > 0) {
          const successfulFiles = data.filesCreated.filter((f: any) => f.success);
          if (successfulFiles.length > 0) {
            responseContent += `\n\n✅ **Files Created:**\n`;
            successfulFiles.forEach((file: any) => {
              responseContent += `- \`${file.path}\` ✓\n`;
            });
          }
          
          if (onFilesCreated) {
            setTimeout(() => {
              onFilesCreated();
            }, 1000);
          }
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to generate project');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `wizard-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Error generating project**\n\n${error.message}\n\nPlease try again or ask me manually.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !projectId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');

    // Handle wizard mode
    if (wizardMode) {
      setIsLoading(true);
      setTimeout(() => {
        processWizardAnswer(currentInput);
      }, 300); // Small delay for UX
      return;
    }

    setIsLoading(true);

    try {
      // Build request body - Azure DeepSeek only
      const requestBody: any = {
        message: currentInput,
        currentFile: currentFile?.path,
        conversationHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      let response: Response;
      
      // ============================================
      // DETAILED REQUEST LOGGING FOR DEBUGGING
      // ============================================
      console.log('\n' + '='.repeat(60));
      console.log('📤 CHAT REQUEST - FULL DETAILS');
      console.log('='.repeat(60));
      console.log('Endpoint:', `/api/app-projects/${projectId}/chat`);
      console.log('Message Length:', requestBody.message?.length, 'characters');
      console.log('\n📝 FULL MESSAGE BEING SENT:');
      console.log('-'.repeat(40));
      console.log(requestBody.message);
      console.log('-'.repeat(40));
      console.log('='.repeat(60) + '\n');
      
      try {
        response = await fetch(`/api/app-projects/${projectId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important: Include cookies for authentication
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });
      } catch (fetchError: any) {
        // Handle network/fetch errors (before response is received)
        console.error('❌ Fetch error (network/CORS):', {
          error: fetchError,
          message: fetchError?.message,
          name: fetchError?.name,
          stack: fetchError?.stack,
        });
        throw new Error(`Network error: ${fetchError?.message || 'Failed to connect to server. Please check your connection.'}`);
      }

      if (response.ok) {
        let data: any;
        try {
          data = await response.json();
          
          // CRITICAL: Log response to debug file creation
          console.log('\n' + '='.repeat(60));
          console.log('📥 CHAT API RESPONSE RECEIVED');
          console.log('='.repeat(60));
          console.log('Response keys:', Object.keys(data));
          console.log('Has filesCreated:', !!data.filesCreated);
          console.log('filesCreated length:', data.filesCreated?.length || 0);
          console.log('filesCreated details:', JSON.stringify(data.filesCreated, null, 2));
          console.log('Response summary:', data.summary);
          
          // CRITICAL: Verify filesCreated structure
          if (data.filesCreated && Array.isArray(data.filesCreated)) {
            const successful = data.filesCreated.filter((f: any) => f.success);
            console.log('✅ Successful files:', successful.length);
            successful.forEach((f: any, idx: number) => {
              console.log(`  ${idx + 1}. ${f.path} - ${f.success ? '✅' : '❌'}`);
            });
          } else {
            console.warn('⚠️ filesCreated is not an array or missing!');
          }
          console.log('='.repeat(60) + '\n');
        } catch (jsonError: any) {
          console.error('❌ Failed to parse response JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }
        
        console.log('📥 Chat response received:', {
          provider: data.provider,
          model: data.model,
          filesCreated: data.filesCreated?.length || 0,
          successfulFiles: data.filesCreated?.filter((f: any) => f.success).length || 0,
          filePaths: data.filesCreated?.map((f: any) => f.path) || []
        });
        
        // Show load balancer info if available
        if (data.loadBalancerStats) {
          console.log('Load Balancer Stats:', {
            provider: data.provider,
            usage: data.loadBalancerStats.currentUsage,
            handled: data.loadBalancerStats.requestsHandled,
          });
        }
        
        // Handle file creation results
        let responseContent = data.response || 'I apologize, but I could not generate a response.';
        
        // Add provider/model info at the top of the response
        if (data.provider || data.model) {
          const providerInfo = [];
          if (data.provider) {
            providerInfo.push(`**Provider:** ${data.provider}`);
          }
          if (data.model) {
            providerInfo.push(`**Model:** ${data.model}`);
          }
          if (data.usedFallback) {
            providerInfo.push(`⚠️ *Using fallback model*`);
          }
          if (providerInfo.length > 0) {
            responseContent = `🤖 ${providerInfo.join(' | ')}\n\n---\n\n${responseContent}`;
          }
        }
        
        if (data.filesCreated && data.filesCreated.length > 0) {
          const successfulFiles = data.filesCreated.filter((f: any) => f.success);
          const failedFiles = data.filesCreated.filter((f: any) => !f.success);
          
          if (successfulFiles.length > 0) {
            responseContent += `\n\n✅ **Files Created:**\n`;
            successfulFiles.forEach((file: any) => {
              responseContent += `- \`${file.path}\` ✓\n`;
            });
          }
          
          if (failedFiles.length > 0) {
            responseContent += `\n\n⚠️ **Failed to create:**\n`;
            failedFiles.forEach((file: any) => {
              responseContent += `- \`${file.path}\`: ${file.error || 'Unknown error'}\n`;
            });
            
          }
          
          // CRITICAL: Refresh file list IMMEDIATELY - Cursor-like smooth flow
          if (successfulFiles.length > 0) {
            console.log('\n' + '='.repeat(80));
            console.log('🔄 REFRESHING UI AFTER FILE CREATION');
            console.log('='.repeat(80));
            console.log('Successful files:', successfulFiles.length);
            console.log('File paths:', successfulFiles.map((f: any) => f.path));
            console.log('Has callback:', !!onFilesCreated);
            console.log('Project ID:', projectId);
            
            // IMMEDIATE: Multiple refresh methods for reliability
            const refreshFiles = () => {
              console.log('🔄 Calling refreshFiles()...');
              console.log('  - Calling onFilesCreated callback:', !!onFilesCreated);
              if (onFilesCreated) {
                try {
                  onFilesCreated();
                  console.log('  ✅ onFilesCreated callback executed');
                } catch (err) {
                  console.error('  ❌ Error calling onFilesCreated:', err);
                }
              } else {
                console.warn('  ⚠️ onFilesCreated callback is not available');
              }
              
              console.log('  - Dispatching files-updated event...');
              const event = new CustomEvent('files-updated', {
                detail: { 
                  projectId,
                  filesCreated: successfulFiles.map((f: any) => f.path)
                }
              });
              window.dispatchEvent(event);
              console.log('  ✅ files-updated event dispatched:', event.detail);
            };
            
            const refreshPreview = () => {
              console.log('🔄 Calling refreshPreview()...');
              window.dispatchEvent(new CustomEvent('preview-updated', { detail: { projectId } }));
              window.dispatchEvent(new CustomEvent('auto-refresh-preview', {
                detail: { projectId, filesCreated: successfulFiles.map((f: any) => f.path) }
              }));
              console.log('  ✅ Preview refresh events dispatched');
            };
            
            // Execute immediately (no delays for smooth Cursor-like experience)
            console.log('\n🚀 Executing immediate refresh...');
            refreshFiles();
            refreshPreview();
            
            // Also refresh after delays to catch any race conditions
            setTimeout(() => {
              console.log('\n🔄 Delayed refresh (500ms)...');
              refreshFiles();
            }, 500);
            
            setTimeout(() => {
              console.log('\n🔄 Delayed refresh (1500ms)...');
              refreshFiles();
              refreshPreview();
            }, 1500);
            
            setTimeout(() => {
              console.log('\n🔄 Final refresh (3000ms)...');
              refreshFiles();
            }, 3000);
            
            console.log('\n✅ All refresh events dispatched');
            console.log('='.repeat(80) + '\n');
            
            // CRITICAL: Also trigger a visual update by scrolling to show new files
            setTimeout(() => {
              // Scroll chat to bottom to show success message
              if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTo({
                  top: messagesContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }
            }, 100);
          } else {
            console.warn('\n⚠️ No successful files to refresh:', {
              totalFiles: data.filesCreated?.length || 0,
              successfulFiles: successfulFiles.length,
              failedFiles: failedFiles.length
            });
            
            // Still try to refresh - files might have been created but not in response
            console.log('🔄 Refresh attempt: No files in response, refreshing anyway...');
            if (onFilesCreated) {
              setTimeout(() => {
                console.log('  - Calling onFilesCreated callback...');
                onFilesCreated();
                window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
                console.log('  ✅ Refresh attempted');
              }, 1000);
            } else {
              console.warn('  ⚠️ onFilesCreated callback not available');
            }
          }
        } else {
          console.warn('\n⚠️ NO FILES CREATED - filesCreated array is empty!');
          console.warn('This might mean:');
          console.warn('  1. AI response didn\'t contain code blocks');
          console.warn('  2. File parsing failed');
          console.warn('  3. Files weren\'t saved to database');
          console.warn('\n💡 Try clicking "Extract Files" button if code is visible in chat');
          
          // CRITICAL: Still try to refresh - files might have been created but not reported
          // This is important because sometimes files are created but the response doesn't include them
          console.log('\n🔄 Refresh attempt: Empty filesCreated, refreshing anyway...');
          console.log('  - This ensures we check the database for any new files');
          
          if (onFilesCreated) {
            // Multiple refresh attempts
            setTimeout(() => {
              console.log('  - Refresh attempt 1 (500ms)...');
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 500);
            
            setTimeout(() => {
              console.log('  - Refresh attempt 2 (2000ms)...');
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 2000);
            
            setTimeout(() => {
              console.log('  - Refresh attempt 3 (5000ms)...');
              onFilesCreated();
              window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
            }, 5000);
          } else {
            console.warn('  ⚠️ onFilesCreated callback not available');
          }
        }
        
        // CRITICAL: ALWAYS refresh after chat response, even if filesCreated is empty
        // This ensures we catch any files that were created but not reported
        console.log('\n🔄 Final refresh check: Always refreshing after chat response...');
        setTimeout(() => {
          if (onFilesCreated) {
            console.log('  - Final refresh (3000ms after response)...');
            onFilesCreated();
            window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
          }
        }, 3000);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Try to get detailed error from response
        let errorData: any = {};
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { error: text || `HTTP ${response.status} ${response.statusText}` };
          }
        } catch {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        
        console.error('❌ Chat API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: `/api/app-projects/${projectId}/chat`
        });
        
        // Handle specific HTTP status codes
        if (response.status === 401) {
          throw new Error('Not authenticated: Please sign in to use the chat.');
        } else if (response.status === 403) {
          throw new Error('Not authorized: You do not have permission to access this project.');
        } else if (response.status === 404) {
          throw new Error('Project not found: The project may have been deleted.');
        } else if (response.status === 500 || response.status === 503) {
          const serverError = errorData.error || errorData.message || 'Server error';
          throw new Error(`Server error: ${serverError}`);
        }
        
        // Extract detailed error message
        const detailedError = errorData.error || errorData.message || errorData.details || `HTTP ${response.status}`;
        throw new Error(detailedError);
      }
    } catch (error: any) {
      // Better error logging - handle empty or malformed error objects
      let errorMessage = 'Unknown error occurred';
      let errorName = 'Error';
      let errorStack = '';
      
      // Try multiple ways to extract error information
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
          errorName = error.name || errorName;
          errorStack = error.stack || errorStack;
        } else if (error?.message) {
          errorMessage = error.message;
          errorName = error.name || errorName;
          errorStack = error.stack || errorStack;
        } else {
          // Try to stringify the error
          try {
            const errorStr = String(error);
            if (errorStr && errorStr !== '[object Object]' && errorStr !== '[object Error]') {
              errorMessage = errorStr;
            }
          } catch {
            // If stringification fails, try JSON
            try {
              const errorJson = JSON.stringify(error);
              if (errorJson && errorJson !== '{}') {
                errorMessage = `Error: ${errorJson}`;
              }
            } catch {
              // Last resort
              errorMessage = 'An unknown error occurred. Please check server logs.';
            }
          }
        }
      }
      
      console.error('❌ Chat error caught:', {
        errorType: error?.constructor?.name || typeof error,
        errorName,
        errorMessage,
        errorStack: errorStack || error?.stack,
        errorObject: error,
        // Log raw error for debugging
        rawError: error,
      });
      
      // Handle specific error types
      if (error.message?.includes('401') || error.message?.includes('Not authenticated') || error.message?.includes('authentication')) {
        errorMessage = `❌ Authentication Error\n\nYou are not logged in or your session has expired.\n\n**Please:**\n1. Sign in to your account\n2. Refresh the page and try again`;
      } else if (error.message?.includes('403') || error.message?.includes('Not authorized')) {
        errorMessage = `❌ Authorization Error\n\nYou don't have permission to access this project.\n\n**Please:**\n1. Ensure you're signed in with the correct account\n2. Check that you own this project`;
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        errorMessage = `❌ Azure DeepSeek endpoint not found\n\nPlease check:\n- AZURE_DEEPSEEK_URL is configured\n- Service is running\n- Check server logs for details`;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
        errorMessage = `❌ Network Error\n\nUnable to connect to server. Please check your connection and try again.`;
      } else {
        errorMessage = `❌ Error: ${error.message || 'Unknown error occurred'}\n\nPlease check server logs for details.`;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="bg-[#0a0a0a] border-l border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm">AI Code Assistant</h3>
            <p className="text-xs text-gray-400">Powered by Azure DeepSeek</p>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable area that takes remaining space */}
      <div 
        ref={messagesContainerRef}
        className="px-4 py-6 space-y-6"
        style={{ 
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(156, 163, 175, 0.5) rgba(10, 10, 10, 0.5)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoadingHistory && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-400 text-sm">Loading chat history...</div>
          </div>
        )}
        {!isLoadingHistory && messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-white font-semibold text-sm">Assistant</div>
                    {message.role === 'assistant' && (message.content.includes('```') || message.content.includes('File:')) && (
                      <button
                        onClick={() => handleExtractFiles(message.content, message.id)}
                        disabled={message.extractingFiles || isLoading}
                        className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                        title="Extract files from this message"
                      >
                        {message.extractingFiles ? (
                          <>
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Extracting...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Extract Files
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div className="bg-emerald-500/90 text-white rounded-2xl px-4 py-3 shadow-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm mb-1">Assistant</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a] z-10">
        <form onSubmit={handleSend} className="relative">
          <div className="flex items-center gap-0 w-full">
            <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-l-full border border-gray-500/30 focus-within:border-gray-400/50 transition-all px-4 py-3.5">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={wizardMode ? (WIZARD_QUESTIONS[wizardStep]?.question || "Answer the question...") : "Ask me to generate code..."}
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 rounded-r-full border border-l-0 border-gray-500/30 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

