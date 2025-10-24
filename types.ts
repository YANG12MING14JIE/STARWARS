
export enum FeatureId {
  CHAT = 'chat',
  IMAGE_GEN = 'image_gen',
  IMAGE_EDIT = 'image_edit',
  VIDEO_GEN = 'video_gen',
  VIDEO_ANALYSIS = 'video_analysis',
  LIVE_CONVERSATION = 'live_conversation',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            uri: string;
            reviewText: string;
            reviewerName: string;
        }[]
    }[]
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  video?: string;
  groundingChunks?: GroundingChunk[];
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type VideoAspectRatio = "16:9" | "9:16";
