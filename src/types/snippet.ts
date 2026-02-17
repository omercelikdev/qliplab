export interface Snippet {
  id: string;
  title: string;
  content: string;
  categoryId?: string;
  syntax: string;
  isPinned: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SnippetCategory {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  createdAt: Date;
}
