import { create } from 'zustand';
import type { Question, Section } from '@/types/questionnaire';

const genId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface CanvasSnapshot {
  questions: Question[];
  sections: Section[];
}

interface FormBuilderState {
  questions: Question[];
  sections: Section[];
  selectedQuestionId: string | null;
  expandedSections: string[];
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSavedAt: number | null;
  version: number;
  activePanel: 'properties' | 'options' | 'validation' | 'skip-logic' | 'translations' | null;

  setQuestions: (questions: Question[]) => void;
  setSections: (sections: Section[]) => void;
  moveQuestion: (questionId: string, targetIndex: number) => void;
  duplicateQuestion: (questionId: string) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  reorderQuestions: (sectionId: string, questionIds: string[]) => void;
  selectQuestion: (id: string | null) => void;
  addSection: (section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  removeSection: (id: string) => void;
  toggleSectionExpanded: (id: string) => void;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  setSaveStatus: (status: FormBuilderState['saveStatus']) => void;
  setLastSavedAt: (timestamp: number) => void;
  setVersion: (version: number) => void;
  setActivePanel: (panel: FormBuilderState['activePanel']) => void;
  reset: () => void;
}

export const useFormBuilderStore = create<FormBuilderState>()((set, get) => ({
  questions: [],
  sections: [],
  selectedQuestionId: null,
  expandedSections: [],
  undoStack: [],
  redoStack: [],
  saveStatus: 'saved',
  lastSavedAt: null,
  version: 1,
  activePanel: null,

  setQuestions: (questions) => set({ questions }),
  setSections: (sections) => set({ sections }),

  moveQuestion: (questionId, targetIndex) => {
    get().pushSnapshot();
    set((state) => {
      const qs = [...state.questions];
      const idx = qs.findIndex((q) => q.id === questionId);
      if (idx === -1) return state;
      const [moved] = qs.splice(idx, 1);
      qs.splice(targetIndex, 0, moved);
      const reindexed = qs.map((q, i) => ({ ...q, order_index: i }));
      return { questions: reindexed, saveStatus: 'unsaved' };
    });
  },

  duplicateQuestion: (questionId) => {
    get().pushSnapshot();
    set((state) => {
      const source = state.questions.find((q) => q.id === questionId);
      if (!source) return state;
      const copy: Question = {
        ...JSON.parse(JSON.stringify(source)),
        id: genId(),
        code: `${source.code}_copy`,
        label: `${source.label} (copy)`,
        order_index: source.order_index + 1,
      };
      const qs = [...state.questions];
      qs.splice(source.order_index + 1, 0, copy);
      const reindexed = qs.map((q, i) => ({ ...q, order_index: i }));
      return { questions: reindexed, saveStatus: 'unsaved' };
    });
  },

  addQuestion: (question) => {
    get().pushSnapshot();
    set((state) => ({ questions: [...state.questions, question], saveStatus: 'unsaved' }));
  },

  updateQuestion: (id, updates) => {
    get().pushSnapshot();
    set((state) => ({
      questions: state.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
      saveStatus: 'unsaved',
    }));
  },

  removeQuestion: (id) => {
    get().pushSnapshot();
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== id),
      selectedQuestionId: state.selectedQuestionId === id ? null : state.selectedQuestionId,
      saveStatus: 'unsaved',
    }));
  },

  reorderQuestions: (sectionId, questionIds) => {
    get().pushSnapshot();
    set((state) => ({
      questions: state.questions.map((q) =>
        q.section_id === sectionId
          ? { ...q, order_index: questionIds.indexOf(q.id) }
          : q
      ),
      saveStatus: 'unsaved',
    }));
  },

  selectQuestion: (id) => set({ selectedQuestionId: id }),

  addSection: (section) => {
    get().pushSnapshot();
    set((state) => ({
      sections: [...state.sections, section],
      expandedSections: [...state.expandedSections, section.id],
      saveStatus: 'unsaved',
    }));
  },

  updateSection: (id, updates) => {
    get().pushSnapshot();
    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      saveStatus: 'unsaved',
    }));
  },

  removeSection: (id) => {
    get().pushSnapshot();
    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      questions: state.questions.filter((q) => q.section_id !== id),
      expandedSections: state.expandedSections.filter((s) => s !== id),
      saveStatus: 'unsaved',
    }));
  },

  toggleSectionExpanded: (id) =>
    set((state) => ({
      expandedSections: state.expandedSections.includes(id)
        ? state.expandedSections.filter((s) => s !== id)
        : [...state.expandedSections, id],
    })),

  pushSnapshot: () => {
    const { questions, sections, undoStack } = get();
    const snapshot: CanvasSnapshot = { questions: JSON.parse(JSON.stringify(questions)), sections: JSON.parse(JSON.stringify(sections)) };
    const updated = [...undoStack, snapshot];
    if (updated.length > 50) updated.shift();
    set({ undoStack: updated, redoStack: [] });
  },

  undo: () => {
    const { undoStack, questions, sections } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      questions: previous.questions,
      sections: previous.sections,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, { questions: JSON.parse(JSON.stringify(questions)), sections: JSON.parse(JSON.stringify(sections)) }],
      saveStatus: 'unsaved',
    });
  },

  redo: () => {
    const { redoStack, questions, sections } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      questions: next.questions,
      sections: next.sections,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, { questions: JSON.parse(JSON.stringify(questions)), sections: JSON.parse(JSON.stringify(sections)) }],
      saveStatus: 'unsaved',
    });
  },

  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
  setVersion: (version) => set({ version }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  reset: () =>
    set({
      questions: [],
      sections: [],
      selectedQuestionId: null,
      expandedSections: [],
      undoStack: [],
      redoStack: [],
      saveStatus: 'saved',
      lastSavedAt: null,
      version: 1,
      activePanel: null,
    }),
}));
