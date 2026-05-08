// 项目管理 Zustand Store
// 管理项目、看板列、任务、里程碑的 CRUD 状态
// 数据持久化到 localStorage，后续可接 API

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// ─── 辅助函数 ───────────────────────────────────────

let _counter = Date.now();
function uid(): string {
  return `p-${++_counter}-${Math.random().toString(36).slice(2, 8)}`;
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

  // ── 项目 CRUD ──
  createProject: (data: Omit<Project, 'id' | 'createdAt'>) => Project;
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | null;

  // ── 看板列 CRUD ──
  createColumn: (projectId: string, title: string) => Column;
  updateColumn: (id: string, data: Partial<Pick<Column, 'title' | 'order'>>) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (projectId: string, orderedIds: string[]) => void;

  // ── 任务 CRUD ──
  createTask: (data: Omit<Task, 'id' | 'order'>) => Task;
  updateTask: (id: string, data: Partial<Omit<Task, 'id' | 'order'>>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, targetColumnId: string, targetOrder: number) => void;
  reorderTasks: (columnId: string, orderedIds: string[]) => void;

  // ── 里程碑 CRUD ──
  createMilestone: (data: Omit<Milestone, 'id'>) => Milestone;
  updateMilestone: (id: string, data: Partial<Omit<Milestone, 'id'>>) => void;
  deleteMilestone: (id: string) => void;

  // ── 查询辅助 ──
  getColumnsByProject: (projectId: string) => Column[];
  getTasksByColumn: (columnId: string) => Task[];
  getMilestonesByProject: (projectId: string) => Milestone[];
  getAllTasksByProject: (projectId: string) => Task[];
}

// ─── Store 实现 ─────────────────────────────────────

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      columns: [],
      tasks: [],
      milestones: [],

      // ── 项目 CRUD ──

      createProject: (data) => {
        const project: Project = {
          ...data,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project], currentProjectId: project.id }));
        // 创建默认列
        const todoCol: Column = { id: uid(), projectId: project.id, title: '待办', order: 0 };
        const doingCol: Column = { id: uid(), projectId: project.id, title: '进行中', order: 1 };
        const doneCol: Column = { id: uid(), projectId: project.id, title: '已完成', order: 2 };
        set((s) => ({ columns: [...s.columns, todoCol, doingCol, doneCol] }));
        return project;
      },

      updateProject: (id, data) => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
      },

      deleteProject: (id) => {
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

      createColumn: (projectId, title) => {
        const cols = get().columns.filter((c) => c.projectId === projectId);
        const maxOrder = cols.reduce((max, c) => Math.max(max, c.order), -1);
        const column: Column = { id: uid(), projectId, title, order: maxOrder + 1 };
        set((s) => ({ columns: [...s.columns, column] }));
        return column;
      },

      updateColumn: (id, data) => {
        set((s) => ({
          columns: s.columns.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },

      deleteColumn: (id) => {
        set((s) => ({
          columns: s.columns.filter((c) => c.id !== id),
          tasks: s.tasks.filter((t) => t.columnId !== id),
        }));
      },

      reorderColumns: (projectId, orderedIds) => {
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

      createTask: (data) => {
        const existing = get().tasks.filter((t) => t.columnId === data.columnId);
        const maxOrder = existing.reduce((max, t) => Math.max(max, t.order), -1);
        const task: Task = { ...data, id: uid(), order: maxOrder + 1 };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      updateTask: (id, data) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      moveTask: (taskId, targetColumnId, targetOrder) => {
        set((s) => {
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) return s;

          // 目标列中 order >= targetOrder 的任务全部 +1
          const updatedTasks = s.tasks.map((t) => {
            if (t.id === taskId) {
              return { ...t, columnId: targetColumnId, order: targetOrder };
            }
            if (t.columnId === targetColumnId && t.order >= targetOrder) {
              return { ...t, order: t.order + 1 };
            }
            // 原列中 order > task.order 的任务全部 -1
            if (t.columnId === task.columnId && t.order > task.order) {
              return { ...t, order: t.order - 1 };
            }
            return t;
          });

          return { tasks: updatedTasks };
        });
      },

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

      createMilestone: (data) => {
        const milestone: Milestone = { ...data, id: uid() };
        set((s) => ({ milestones: [...s.milestones, milestone] }));
        return milestone;
      },

      updateMilestone: (id, data) => {
        set((s) => ({
          milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },

      deleteMilestone: (id) => {
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
    }),
    {
      name: 'xone-project-store',
    }
  )
);
