/**
 * WF-ADENGINE Types
 */

export interface AdConcept {
  // REQUIRED
  project_name: string;
  product_name: string;
  product_description: string;
  target_audience: string;
  ad_objective: string;
  creative_direction: string;
  
  // OPTIONAL
  product_images?: string[];
  brand_colors?: string[];
  reference_ad_url?: string;
  voiceover_script?: string;
  music_mood?: string;
  num_scenes?: number;
  duration_seconds?: number;
  aspect_ratios?: string[];
  include_faces?: boolean;
  camera_spec?: string;
  visual_style?: string;
  color_grade?: string;
}

export interface StoryboardScene {
  scene_number: number;
  scene_name: string;
  visual_description: string;
  camera_spec: string;
  mood_lighting: string;
  duration_seconds: number;
}

export interface Storyboard {
  scenes: StoryboardScene[];
  anchorPrompts: string[]; // 5 variations for anchor frame
  suggestedScript?: string;
}

export interface ProjectStatus {
  project_id: string;
  status: string;
  current_phase: string;
}

export interface AdEngineAsset {
  id?: string;
  project_id: string;
  phase: string;
  scene_number?: number;
  variation_number?: number;
  asset_type: string;
  asset_url: string;
  prompt_used?: string;
  model_used?: string;
  kie_task_id?: string;
  is_approved?: boolean;
  approved_at?: string;
  trim_start_seconds?: number;
  trim_end_seconds?: number;
  speed_multiplier?: number;
  cost_credits?: number;
  created_at?: string;
}

export interface SlackMessageRecord {
  id?: string;
  project_id: string;
  asset_id?: string;
  slack_channel: string;
  slack_message_ts: string;
  checkpoint_type: string;
  resolved?: boolean;
  resolved_at?: string;
}

export interface SceneFrameResult {
  scene_number: number;
  scene_name: string;
  image_urls: string[];
}

export interface VideoClipResult {
  scene_number: number;
  scene_name: string;
  video_urls: string[];
}

export interface VoiceoverResult {
  audio_urls: string[];
  script_used: string;
}
