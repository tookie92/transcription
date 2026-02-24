declare module '@xenova/transformers' {
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
  
  export const AutoProcessor: {
    from_pretrained: (model: string, options?: any) => Promise<any>;
  };
  
  export const AutoModelForAudioFrameClassification: {
    from_pretrained: (model: string, options?: any) => Promise<any>;
  };
  
  export const env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
}
