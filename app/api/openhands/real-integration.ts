/**
 * Real OpenHands Docker Integration
 * Connects to actual OpenHands runtime via Docker API
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface OpenHandsDockerConfig {
  image: string;
  workspace: string;
  model: string;
  maxSteps: number;
  agentClass: string;
}

export interface OpenHandsTask {
  instruction: string;
  files?: Array<{ path: string; content: string }>;
  workingDirectory: string;
}

export interface OpenHandsResult {
  success: boolean;
  sessionId: string;
  output: string;
  files?: Array<{ path: string; content: string }>;
  logs: string[];
  metrics?: {
    stepsUsed: number;
    timeElapsed: number;
    tokensUsed?: number;
  };
  error?: string;
}

/**
 * OpenHands Docker Client
 * Manages Docker containers running OpenHands agents
 */
export class OpenHandsDockerClient {
  private config: OpenHandsDockerConfig;
  private containerPrefix = 'openhands';

  constructor(config?: Partial<OpenHandsDockerConfig>) {
    this.config = {
      image: config?.image || 'ghcr.io/all-hands-ai/openhands:latest',
      workspace: config?.workspace || '/workspace',
      model: config?.model || 'gpt-4o', // OpenAI model to use
      maxSteps: config?.maxSteps || 50,
      agentClass: config?.agentClass || 'CodeActAgent',
    };
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      console.error('Docker not available:', error);
      return false;
    }
  }

  /**
   * Pull OpenHands Docker image if not present
   */
  async ensureImage(): Promise<void> {
    try {
      const { stdout } = await execAsync(`docker images ${this.config.image} -q`);
      if (!stdout.trim()) {
        console.log(`Pulling OpenHands image: ${this.config.image}...`);
        await execAsync(`docker pull ${this.config.image}`);
        console.log('Image pulled successfully');
      }
    } catch (error) {
      throw new Error(`Failed to ensure Docker image: ${error}`);
    }
  }

  /**
   * Create and start an OpenHands container
   */
  async startContainer(
    sessionId: string,
    task: OpenHandsTask,
    openaiKey?: string
  ): Promise<string> {
    const containerName = `${this.containerPrefix}_${sessionId}`;
    const workspaceDir = `/tmp/openhands_${sessionId}`;

    try {
      // Create workspace directory
      await execAsync(`mkdir -p ${workspaceDir}`);

      // Write initial files if provided
      if (task.files && task.files.length > 0) {
        for (const file of task.files) {
          const filePath = `${workspaceDir}/${file.path}`;
          const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
          if (dirPath) {
            await execAsync(`mkdir -p ${dirPath}`);
          }
          await execAsync(`echo ${JSON.stringify(file.content)} > ${filePath}`);
        }
      }

      // Build Docker command
      const dockerCmd = [
        'docker run',
        '-d', // Detached mode
        '--name', containerName,
        '-v', `${workspaceDir}:${this.config.workspace}`,
        ...(openaiKey ? ['-e', `OPENAI_API_KEY=${openaiKey}`] : []),
        '-e', `LLM_MODEL=${this.config.model}`,
        '-e', `AGENT_CLASS=${this.config.agentClass}`,
        '-e', `MAX_ITERATIONS=${this.config.maxSteps}`,
        '-e', `WORKSPACE_DIR=${this.config.workspace}`,
        this.config.image,
      ].join(' ');

      const { stdout: containerId } = await execAsync(dockerCmd);

      return containerId.trim();
    } catch (error) {
      throw new Error(`Failed to start container: ${error}`);
    }
  }

  /**
   * Execute task in OpenHands container
   */
  async executeTask(
    containerId: string,
    task: OpenHandsTask
  ): Promise<{ output: string; exitCode: number }> {
    try {
      // Send task instruction via Docker exec
      const command = `docker exec ${containerId} python -c "from openhands.core.main import run_controller; run_controller('${task.instruction.replace(/'/g, "\\'")}')"`;

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        output: stdout || stderr,
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        output: error.stderr || error.stdout || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Get container logs
   */
  async getLogs(containerIdOrName: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs ${containerIdOrName}`);
      return stdout;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return '';
    }
  }

  /**
   * Get files from container workspace
   */
  async getWorkspaceFiles(
    containerId: string,
    paths?: string[]
  ): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    try {
      const workspacePath = this.config.workspace;

      // If specific paths provided, get those; otherwise get all
      const filePaths = paths || await this.listWorkspaceFiles(containerId);

      for (const path of filePaths) {
        try {
          const { stdout } = await execAsync(
            `docker exec ${containerId} cat ${workspacePath}/${path}`
          );
          files.push({ path, content: stdout });
        } catch (error) {
          console.error(`Failed to read file ${path}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to get workspace files:', error);
    }

    return files;
  }

  /**
   * List all files in workspace
   */
  async listWorkspaceFiles(containerId: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `docker exec ${containerId} find ${this.config.workspace} -type f`
      );
      return stdout
        .split('\n')
        .filter(Boolean)
        .map((p) => p.replace(`${this.config.workspace}/`, ''));
    } catch (error) {
      console.error('Failed to list workspace files:', error);
      return [];
    }
  }

  /**
   * Stop and remove container
   */
  async cleanup(containerIdOrName: string): Promise<void> {
    try {
      await execAsync(`docker stop ${containerIdOrName}`);
      await execAsync(`docker rm ${containerIdOrName}`);
    } catch (error) {
      console.error('Failed to cleanup container:', error);
    }
  }

  /**
   * Main execution method - runs complete OpenHands workflow
   */
  async execute(
    task: OpenHandsTask,
    openaiKey?: string
  ): Promise<OpenHandsResult> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    const logs: string[] = [];
    let containerId: string | null = null;

    try {
      // Check Docker availability
      logs.push('Checking Docker availability...');
      const dockerAvailable = await this.isDockerAvailable();
      if (!dockerAvailable) {
        throw new Error('Docker is not available on this system');
      }

      // Ensure image exists
      logs.push('Ensuring OpenHands Docker image...');
      await this.ensureImage();

      // Start container
      logs.push('Starting OpenHands container...');
      containerId = await this.startContainer(sessionId, task, openaiKey);
      logs.push(`Container started: ${containerId}`);

      // Wait for container to be ready
      logs.push('Waiting for container initialization...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Execute task
      logs.push('Executing task...');
      const { output, exitCode } = await this.executeTask(containerId, task);
      logs.push('Task execution completed');

      // Get result files
      logs.push('Retrieving result files...');
      const files = await this.getWorkspaceFiles(containerId);

      // Get full logs
      const containerLogs = await this.getLogs(containerId);
      logs.push('Logs retrieved');

      const timeElapsed = Date.now() - startTime;

      // Parse metrics from logs if available
      const stepsMatch = containerLogs.match(/Steps used: (\d+)/i);
      const tokensMatch = containerLogs.match(/Tokens used: (\d+)/i);

      return {
        success: exitCode === 0,
        sessionId,
        output,
        files,
        logs: [...logs, ...containerLogs.split('\n')],
        metrics: {
          stepsUsed: stepsMatch ? parseInt(stepsMatch[1], 10) : 0,
          timeElapsed,
          tokensUsed: tokensMatch ? parseInt(tokensMatch[1], 10) : undefined,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Error: ${errorMessage}`);

      return {
        success: false,
        sessionId,
        output: '',
        logs,
        error: errorMessage,
      };
    } finally {
      // Cleanup container
      if (containerId) {
        logs.push('Cleaning up container...');
        await this.cleanup(containerId);
      }
    }
  }
}

/**
 * Singleton instance
 */
let dockerClient: OpenHandsDockerClient | null = null;

export function getOpenHandsClient(config?: Partial<OpenHandsDockerConfig>): OpenHandsDockerClient {
  if (!dockerClient) {
    dockerClient = new OpenHandsDockerClient(config);
  }
  return dockerClient;
}
