// 项目管理 Zustand Store
// 管理项目、看板列、任务、里程碑的 CRUD 状态
// 数据通过后端 API 持久化

import { create } from 'zustand';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client';

// ─── 类型定义 ───────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived' | 'planning';
  startDate: string;   // ISO date string
  endDate: string;     // ISO date string
  createdAt: string;   // ISO date string
}

export interface Column {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string;
  assignee: string;    // 负责人姓名
  priority: 'high' | 'medium' | 'low';
  dueDate: string;     // ISO date string
  startDate?: string;  // ISO date string, 用于甘特图
  order: number;
  tags: string[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;     // ISO date string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  progress: number;    // 0-100
}

// ─── API 响应原始类型（snake_case） ────────────────

interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface ApiColumn {
  id: string;
  project_id: string;
  title: string;
  order: number;
}

interface ApiTask {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  order: number;
  tags: string | null;  // JSON string
}

interface ApiMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  progress: number | null;
}

// ─── 字段转换辅助 ──────────────────────────────────

function toProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    description: api.description || '',
    status: (api.status as Project['status']) || 'active',
    startDate: api.start_date || '',
    endDate: api.end_date || '',
    createdAt: api.created_at || '',
  };
}

function toColumn(api: ApiColumn): Column {
  return {
    id: api.id,
    projectId: api.project_id,
    title: api.title,
    order: api.order,
  };
}

function toTask(api: ApiTask): Task {
  let tags: string[] = [];
  if (api.tags) {
    try {
      tags = JSON.parse(api.tags);
    } catch {
      tags = [];
    }
  }
  return {
    id: api.id,
    columnId: api.column_id,
    title: api.title,
    description: api.description || '',
    assignee: api.assignee || '',
    priority: (api.priority as Task['priority']) || 'medium',
    dueDate: api.due_date || '',
    startDate: api.start_date || '',
    order: api.order,
    tags,
  };
}

function toMilestone(api: ApiMilestone): Milestone {
  return {
    id: api.id,
    projectId: api.project_id,
    title: api.title,
    description: api.description || '',
    dueDate: api.due_date || '',
    status: (api.status as Milestone['status']) || 'pending',
    progress: api.progress || 0,
  };
}

/** 将 store 的 Task 数据转为 API 的 snake_case body */
function taskToApiBody(data: Partial<Task> & { columnId?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.assignee !== undefined) body.assignee = data.assignee;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.dueDate !== undefined) body.due_date = data.dueDate || null;
  if (data.startDate !== undefined) body.start_date = data.startDate || null;
  if (data.columnId !== undefined) body.column_id = data.columnId;
  if (data.tags !== undefined) body.tags = JSON.stringify(data.tags);
  return body;
}

/** 将 store 的 Milestone 数据转为 API 的 snake_case body */
function milestoneToApiBody(data: Partial<Milestone> & { projectId?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.dueDate !== undefined) body.due_date = data.dueDate || null;
  if (data.status !== undefined) body.status = data.status;
  if (data.progress !== undefined) body.progress = data.progress;
  return body;
}

// ─── Store 接口 ─────────────────────────────────────

interface ProjectStore {
  // 项目
  projects: Project[];
  currentProjectId: string | null;

  // 看板
  columns: Column[];
  tasks: Task[];

  // 里程碑
  milestones: Milestone[];

  // 加载状态
  loading: boolean;
  error: string | null;

  // ── 数据加载 ──
  fetchProjects: () => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;

  // ── 项目 CRUD ──
  createProject: (data: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | null;

  // ── 看板列 CRUD ──
  createColumn: (projectId: string, title: string) => Promise<Column>;
  updateColumn: (id: string, data: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (projectId: string, orderedIds: string[]) => Promise<void>;

  // ── 任务 CRUD ──
  createTask: (data: Omit<Task, 'id' | 'order'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Omit<Task, 'id' | 'order'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, targetColumnId: string, targetOrder: number) => Promise<void>;
  reorderTasks: (columnId: string, orderedIds: string[]) => void;

  // ── 里程碑 CRUD ──
  createMilestone: (data: Omit<Milestone, 'id'>) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Omit<Milestone, 'id'>>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;

  // ── 查询辅助 ──
  getColumnsByProject: (projectId: string) => Column[];
  getTasksByColumn: (columnId: string) => Task[];
  getMilestonesByProject: (projectId: string) => Milestone[];
  getAllTasksByProject: (projectId: string) => Task[];
}

// ─── Store 实现 ─────────────────────────────────────

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  projects: [],
  currentProjectId: null,
  columns: [],
  tasks: [],
  milestones: [],
  loading: false,
  error: null,

  // ── 数据加载 ──

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiGet<ApiProject[]>('/work/projects');
      if (res.code === 0 && Array.isArray(res.data)) {
        set({ projects: res.data.map(toProject), loading: false });
      } else {
        set({ loading: false, error: res.message || '加载项目列表失败' });
      }
    } catch (e) {
      set({ loading: false, error: '网络错误，无法加载项目列表' });
    }
  },

  loadProjectData: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const [colsRes, tasksRes, milestonesRes] = await Promise.all([
        apiGet<ApiColumn[]>(`/work/projects/${projectId}/columns`),
        apiGet<ApiTask[]>(`/work/projects/${projectId}/tasks`),
        apiGet<ApiMilestone[]>(`/work/projects/${projectId}/milestones`),
      ]);

      if (colsRes.code === 0 && Array.isArray(colsRes.data)) {
        const existingCols = get().columns;
        const otherCols = existingCols.filter((c) => c.projectId !== projectId);
        set({ columns: [...otherCols, ...colsRes.data.map(toColumn)] });
      }

      if (tasksRes.code === 0 && Array.isArray(tasksRes.data)) {
        const newTasks = tasksRes.data.map(toTask);
        const existingTasks = get().tasks;
        const projectColIds = new Set(get().columns.filter((c) => c.projectId === projectId).map((c) => c.id));
        const otherTasks = existingTasks.filter((t) => !projectColIds.has(t.columnId));
        set({ tasks: [...otherTasks, ...newTasks] });
      }

      if (milestonesRes.code === 0 && Array.isArray(milestonesRes.data)) {
        const existingMs = get().milestones;
        const otherMs = existingMs.filter((m) => m.projectId !== projectId);
        set({ milestones: [...otherMs, ...milestonesRes.data.map(toMilestone)] });
      }

      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: '加载项目数据失败' });
    }
  },

  // ── 项目 CRUD ──

  createProject: async (data) => {
    const res = await apiPost<ApiProject>('/work/projects', {
      name: data.name,
      description: data.description || null,
      status: data.status || 'active',
      start_date: data.startDate || null,
      end_date: data.endDate || null,
    });
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || '创建项目失败');
    }
    const project = toProject(res.data);
    set((s) => ({
      projects: [...s.projects, project],
      currentProjectId: project.id,
    }));
    // 后端自动创建了3列，加载列数据
    try {
      const colsRes = await apiGet<ApiColumn[]>(`/work/projects/${project.id}/columns`);
      if (colsRes.code === 0 && Array.isArray(colsRes.data)) {
        set((s) => ({ columns: [...s.columns, ...colsRes.data.map(toColumn)] }));
      }
    } catch { /* 列加载失败不影响项目创建 */ }
    return project;
  },

  updateProject: async (id, data) => {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.startDate !== undefined) body.start_date = data.startDate || null;
    if (data.endDate !== undefined) body.end_date = data.endDate || null;

    await apiPut(`/work/projects/${id}`, body);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  deleteProject: async (id) => {
    await apiDelete(`/work/projects/${id}`);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      columns: s.columns.filter((c) => c.projectId !== id),
      tasks: s.tasks.filter((t) => {
        const col = s.columns.find((c) => c.id === t.columnId);
        return col && col.projectId !== id;
      }),
      milestones: s.milestones.filter((m) => m.projectId !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  // ── 看板列 CRUD ──

  createColumn: async (projectId, title) => {
    const cols = get().columns.filter((c) => c.projectId === projectId);
    const maxOrder = cols.reduce((max, c) => Math.max(max, c.order), -1);
    const res = await apiPost<ApiColumn>(`/work/projects/${projectId}/columns`, {
      title,
      order: maxOrder + 1,
    });
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || '创建列失败');
    }
    const column = toColumn(res.data);
    set((s) => ({ columns: [...s.columns, column] }));
    return column;
  },

  updateColumn: async (id, data) => {
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.order !== undefined) body.order = data.order;
    await apiPut(`/work/projects/columns/${id}`, body);
    set((s) => ({
      columns: s.columns.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  },

  deleteColumn: async (id) => {
    await apiDelete(`/work/projects/columns/${id}`);
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.columnId !== id),
    }));
  },

  reorderColumns: async (projectId, orderedIds) => {
    await apiPatch(`/work/projects/${projectId}/columns/reorder`, {
      ordered_ids: orderedIds,
    });
    set((s) => {
      const updated = s.columns
        .filter((c) => c.projectId === projectId)
        .map((c) => ({
          ...c,
          order: orderedIds.indexOf(c.id),
        }));
      const others = s.columns.filter((c) => c.projectId !== projectId);
      return { columns: [...others, ...updated] };
    });
  },

  // ── 任务 CRUD ──

  createTask: async (data) => {
    const res = await apiPost<ApiTask>('/work/projects/tasks', taskToApiBody(data));
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || '创建任务失败');
    }
    const task = toTask(res.data);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const body = taskToApiBody(data);
    // 不通过此接口修改 column_id（移动任务用 moveTask）
    delete body.column_id;
    await apiPut(`/work/projects/tasks/${id}`, body);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  deleteTask: async (id) => {
    await apiDelete(`/work/projects/tasks/${id}`);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  moveTask: async (taskId, targetColumnId, targetOrder) => {
    await apiPatch(`/work/projects/tasks/${taskId}/move`, {
      target_column_id: targetColumnId,
      target_order: targetOrder,
    });
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;

      const updatedTasks = s.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, columnId: targetColumnId, order: targetOrder };
        }
        if (t.columnId === targetColumnId && t.order >= targetOrder) {
          return { ...t, order: t.order + 1 };
        }
        if (t.columnId === task.columnId && t.order > task.order) {
          return { ...t, order: t.order - 1 };
        }
        return t;
      });

      return { tasks: updatedTasks };
    });
  },

  /** reorderTasks: 仅更新本地排序（后端无批量任务排序接口） */
  reorderTasks: (columnId, orderedIds) => {
    set((s) => {
      const updated = s.tasks
        .filter((t) => t.columnId === columnId)
        .map((t) => ({
          ...t,
          order: orderedIds.indexOf(t.id),
        }));
      const others = s.tasks.filter((t) => t.columnId !== columnId);
      return { tasks: [...others, ...updated] };
    });
  },

  // ── 里程碑 CRUD ──

  createMilestone: async (data) => {
    const res = await apiPost<ApiMilestone>(
      `/work/projects/${data.projectId}/milestones`,
      milestoneToApiBody(data)
    );
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || '创建里程碑失败');
    }
    const milestone = toMilestone(res.data);
    set((s) => ({ milestones: [...s.milestones, milestone] }));
    return milestone;
  },

  updateMilestone: async (id, data) => {
    await apiPut(`/work/projects/milestones/${id}`, milestoneToApiBody(data));
    set((s) => ({
      milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }));
  },

  deleteMilestone: async (id) => {
    await apiDelete(`/work/projects/milestones/${id}`);
    set((s) => ({
      milestones: s.milestones.filter((m) => m.id !== id),
    }));
  },

  // ── 查询辅助 ──

  getColumnsByProject: (projectId) => {
    return get()
      .columns.filter((c) => c.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  },

  getTasksByColumn: (columnId) => {
    return get()
      .tasks.filter((t) => t.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  },

  getMilestonesByProject: (projectId) => {
    return get()
      .milestones.filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },

  getAllTasksByProject: (projectId) => {
    const { columns, tasks } = get();
    const projectColIds = new Set(
      columns.filter((c) => c.projectId === projectId).map((c) => c.id)
    );
    return tasks
      .filter((t) => projectColIds.has(t.columnId))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },
}));
