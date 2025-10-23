'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Palette, 
  Play, 
  Download, 
  Trash2, 
  Edit, 
  Folder, 
  FileCode,
  Eye,
  ExternalLink,
  GitBranch,
  Zap,
  Settings,
  Plus,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CodeEditor } from './CodeEditor';
import { FigmaDesignViewer } from './FigmaDesignViewer';
import { ProjectManager } from './ProjectManager';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Project {
  id: string;
  name: string;
  description: string;
  framework: string;
  appType: string;
  files: { [key: string]: string };
  figmaDesigns?: any[];
  deploymentUrl?: string;
  githubUrl?: string;
  created_at: string;
  updated_at: string;
}

interface UserWorkspaceProps {
  user: any;
  onClose?: () => void;
}

export function UserWorkspace({ user, onClose }: UserWorkspaceProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('code');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFramework, setFilterFramework] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, set empty projects
          setProjects([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.projects)) {
        // Convert projects from API format to component format
        const formattedProjects = data.projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description || '',
          framework: project.framework || 'react',
          appType: project.appType || 'workspace',
          files: {}, // Empty for now since API doesn't return files
          created_at: project.createdAt,
          updated_at: project.updatedAt || project.createdAt,
        }));
        setProjects(formattedProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Don't show toast for authentication errors, just set empty projects
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    const firstFile = Object.keys(project.files)[0];
    if (firstFile) {
      setSelectedFile(firstFile);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleDeployToVercel = async (project: Project) => {
    setIsDeploying(true);
    try {
      const response = await fetch('/api/deploy/vercel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          name: project.name,
          files: project.files,
        }),
      });

      if (!response.ok) throw new Error('Deployment failed');

      const { deploymentUrl } = await response.json();

      // Update project with deployment URL
      const { error } = await supabase
        .from('projects')
        .update({ deploymentUrl })
        .eq('id', project.id);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, deploymentUrl } : p
      ));

      toast({
        title: "Success",
        description: "Project deployed to Vercel successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy project",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCreateGitHubRepo = async (project: Project) => {
    setIsCreatingRepo(true);
    try {
      const response = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          name: project.name,
          description: project.description,
          files: project.files,
        }),
      });

      if (!response.ok) throw new Error('Repository creation failed');

      const { githubUrl } = await response.json();

      // Update project with GitHub URL
      const { error } = await supabase
        .from('projects')
        .update({ githubUrl })
        .eq('id', project.id);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === project.id ? { ...p, githubUrl } : p
      ));

      toast({
        title: "Success",
        description: "GitHub repository created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create GitHub repository",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFramework = filterFramework === 'all' || project.framework === filterFramework;
    return matchesSearch && matchesFramework;
  });

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
      case 'js':
      case 'ts':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'css':
      case 'scss':
        return <Palette className="w-4 h-4 text-purple-400" />;
      case 'json':
        return <Settings className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileCode className="w-4 h-4 text-gray-400" />;
    }
  };

  const getFrameworkColor = (framework: string) => {
    switch (framework) {
      case 'nextjs': return 'bg-black text-white';
      case 'react': return 'bg-blue-500 text-white';
      case 'vue': return 'bg-green-500 text-white';
      case 'angular': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md rounded-2xl p-8 text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-hidden">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full h-full bg-white/95 backdrop-blur-xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Welcome back, {user.user_metadata?.full_name || user.email}
                </h1>
                <p className="text-gray-600">Manage your AI-generated projects</p>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/80 border-gray-200/50"
              />
            </div>
            <select
              value={filterFramework}
              onChange={(e) => setFilterFramework(e.target.value)}
              className="px-4 py-2 bg-white/80 border border-gray-200/50 rounded-lg"
            >
              <option value="all">All Frameworks</option>
              <option value="nextjs">Next.js</option>
              <option value="react">React</option>
              <option value="vue">Vue.js</option>
              <option value="angular">Angular</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Projects Sidebar */}
          <div className="w-1/3 border-r border-gray-200/50 bg-white/50 backdrop-blur-sm overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Projects ({filteredProjects.length})
                </h2>
                <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </Button>
              </div>

              <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'space-y-2'}>
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedProject?.id === project.id
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200'
                        : 'bg-white/80 border border-gray-200/50 hover:bg-white/90'
                    }`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg text-white flex-shrink-0">
                        <Code className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs ${getFrameworkColor(project.framework)}`}>
                            {project.framework}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(project.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        {(project.deploymentUrl || project.githubUrl) && (
                          <div className="flex gap-2 mt-2">
                            {project.deploymentUrl && (
                              <a
                                href={project.deploymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Live
                              </a>
                            )}
                            {project.githubUrl && (
                              <a
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GitBranch className="w-3 h-3" />
                                Repo
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                  <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No projects found</p>
                  {searchQuery && (
                    <p className="text-sm text-gray-400 mt-2">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Project Content */}
          <div className="flex-1 flex flex-col">
            {selectedProject ? (
              <>
                {/* Project Header */}
                <div className="p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {selectedProject.name}
                      </h2>
                      <p className="text-gray-600">{selectedProject.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateGitHubRepo(selectedProject)}
                        disabled={isCreatingRepo || !!selectedProject.githubUrl}
                      >
                        <GitBranch className="w-4 h-4 mr-2" />
                        {selectedProject.githubUrl ? 'Repo Created' : 'Create Repo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeployToVercel(selectedProject)}
                        disabled={isDeploying || !!selectedProject.deploymentUrl}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {selectedProject.deploymentUrl ? 'Deployed' : 'Deploy'}
                      </Button>
                      <ProjectManager
                        project={selectedProject}
                        onUpdate={fetchProjects}
                        onDelete={() => handleDeleteProject(selectedProject.id)}
                      />
                    </div>
                  </div>
                </div>

                {/* Project Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="mx-4 mt-4 grid w-fit grid-cols-3 bg-white/80">
                    <TabsTrigger value="code" className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="design" className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Design
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="code" className="h-full m-0 p-0">
                      <CodeEditor
                        project={selectedProject}
                        selectedFile={selectedFile}
                        onFileSelect={setSelectedFile}
                      />
                    </TabsContent>

                    <TabsContent value="design" className="h-full m-0 p-0">
                      <FigmaDesignViewer
                        designs={selectedProject.figmaDesigns || []}
                        projectId={selectedProject.id}
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="h-full m-0 p-0">
                      <div className="h-full flex items-center justify-center bg-gray-50">
                        {selectedProject.deploymentUrl ? (
                          <iframe
                            src={selectedProject.deploymentUrl}
                            className="w-full h-full border-0"
                            title="Project Preview"
                          />
                        ) : (
                          <div className="text-center">
                            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">Deploy your project to see preview</p>
                            <Button
                              onClick={() => handleDeployToVercel(selectedProject)}
                              disabled={isDeploying}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Deploy to Vercel
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Select a project to get started</p>
                  <p className="text-sm text-gray-400">
                    Choose from your projects on the left to view code and designs
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}