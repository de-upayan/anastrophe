export interface ActivityEvent {
  timestamp: string;
  viewerId: string;
}

export interface AmbigramItem {
  id: string;
  title: string;
  recipient?: string;
  imageSrc: string;
  timelapseSrc?: string;
  zipSrc?: string;
  vectorSrc?: string;
  password?: string;
  createdAt?: string;
  views?: number;
  downloads?: number;
  viewsLog?: ActivityEvent[];
  downloadsLog?: ActivityEvent[];
}

export const DEFAULT_ITEMS: AmbigramItem[] = [];
