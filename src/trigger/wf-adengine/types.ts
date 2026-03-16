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
