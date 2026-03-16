/**
 * Generate all 21 test images for cinematic ad test
 * 6 frames + 1 portrait × 3 models = 21 images
 */

const fs = require('fs');
const path = require('path');

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY || '3643c098f1eed0653528201263e662bc';
const OUTPUT_DIR = path.join(__dirname, 'test');

const MODELS = {
  'nano-banana-pro': 'nano-banana-pro',
  'gpt-image-1.5': 'gpt-image-1.5',
  'seedream-5.0-lite': 'seedream-5.0-lite'
};

const FRAMES = {
  'frame1-empty-bay': {
    'nano-banana-pro': 'Professional photography of an empty auto repair shop interior. Single hydraulic car lift with no vehicle, polished concrete floor reflecting overhead LED lights, red metal tool cabinets against the wall, window showing daylight, clean and organized workspace, cinematic composition, shot on 50mm f/2.8, shallow depth of field',
    'gpt-image-1.5': 'A photorealistic wide shot of an empty auto repair shop bay. One hydraulic car lift sits empty in the center, polished concrete floor with tire marks, bright overhead fluorescent lighting, red tool cabinets lining the walls, large roll-up door partially visible, professional automotive environment, sharp focus, high detail',
    'seedream-5.0-lite': 'Photorealistic interior of an empty automotive repair garage. Center frame: one hydraulic vehicle lift with no car, glossy concrete floor reflecting lights, red metal tool storage along walls, natural light from windows, pristine and unused workspace, cinematic lighting, professional photography'
  },
  'frame2-phone-not-ringing': {
    'nano-banana-pro': 'Close-up photograph of a desk phone and smartphone sitting on a cluttered auto repair shop front counter. Both phones are dark and silent, surrounded by scattered paperwork, a coffee mug, and a small calendar. Warm overhead lighting, shallow depth of field focused on the phones, cinematic composition, shot on 85mm f/1.8',
    'gpt-image-1.5': 'A photorealistic close-up of a silent desk phone and a smartphone laying face-up on a messy auto shop front desk. Papers, invoices, and a coffee cup visible in background, both phone screens are dark and off, warm tungsten lighting from above, professional product photography style, high detail',
    'seedream-5.0-lite': 'Photorealistic close-up of a landline desk phone and smartphone on auto repair shop front counter. Both devices inactive and silent, cluttered desk with papers and coffee mug, warm ambient light, shallow focus on phones, cinematic still life composition'
  },
  'frame3-competitor-shop': {
    'nano-banana-pro': 'Professional photography of a busy auto repair shop interior. Four hydraulic lifts all occupied with vehicles being serviced, multiple mechanics in blue work shirts actively working, bright LED overhead lighting, organized chaos of tools and equipment, wide angle shot showing full scope of busy operation, cinematic composition',
    'gpt-image-1.5': 'A photorealistic wide shot of a bustling, busy auto repair shop with all four bays occupied. Mechanics in work uniforms servicing vehicles on each lift, active work environment with tools and equipment visible, bright professional lighting, wide angle view capturing the entire workshop, high detail and sharp focus',
    'seedream-5.0-lite': 'Photorealistic wide shot of a busy auto repair garage. Four hydraulic lifts all with vehicles elevated, mechanics actively working on cars, bright overhead lighting, tools and equipment scattered but organized, professional automotive service environment, wide cinematic framing'
  },
  'frame4-google-profile': {
    'nano-banana-pro': 'Close-up photograph of a smartphone screen displaying a Google Business Profile for an auto repair shop. Screen shows 5-star reviews, business hours, and location map. Phone held by mechanic hand with slight grease stains, shop interior blurred in background, screen content clearly visible, shot on macro lens, high detail',
    'gpt-image-1.5': 'A photorealistic close-up of a smartphone held by a mechanic\'s hand showing a Google Business Profile page. Clean interface with business name, 4.8-star rating, review count, and map visible. Mechanic\'s hand shows work wear, shop environment softly blurred behind, screen sharp and legible, professional product photography',
    'seedream-5.0-lite': 'Photorealistic close-up of smartphone in mechanic\'s hand showing Google Business Profile. Screen displays auto shop name, star rating, reviews, and map. Hand has subtle grease marks, workshop background out of focus, screen content crisp and clear, macro photography style'
  },
  'frame5-phone-ringing': {
    'nano-banana-pro': 'Close-up photograph of the same auto repair shop front desk as before, but now the smartphone screen is lit up and glowing with an incoming call notification. Green accept/decline buttons visible, desk phone also has blinking light. Same cluttered desk setup, warm lighting, screen glow illuminating surrounding papers, shot on 85mm f/1.8',
    'gpt-image-1.5': 'A photorealistic close-up of the same auto shop front desk from earlier, but now transformed with activity. Smartphone screen brightly lit with incoming call interface showing caller ID, green answer button prominent. Desk phone has red blinking light. Papers and coffee cup same position, screen light casting glow, high contrast lighting',
    'seedream-5.0-lite': 'Photorealistic close-up of auto shop front desk, smartphone screen lit with incoming call notification. Bright UI elements showing accept/decline buttons, desk phone LED blinking, cluttered desk unchanged from earlier shot, screen illumination creating dramatic lighting on papers, macro detail'
  },
  'frame6-bays-full': {
    'nano-banana-pro': 'Professional photography of the same auto repair shop from earlier, but now completely transformed and full of activity. All four hydraulic lifts occupied with vehicles, mechanics actively working on each car, additional customer vehicles waiting in designated area, bright overhead lighting, organized busy environment, wide shot showing prosperity and success, cinematic composition',
    'gpt-image-1.5': 'A photorealistic wide shot of the same auto repair shop from earlier frames, but now completely full and thriving. Four lifts all in use with mechanics servicing vehicles, customers visible in waiting area, additional cars parked outside, bright professional lighting, bustling successful business atmosphere, wide angle capturing entire transformation',
    'seedream-5.0-lite': 'Photorealistic wide shot of auto repair shop now completely full and thriving. Four lifts all occupied with active service work, mechanics collaborating on vehicles, customer area with people waiting, bright overhead lights, prosperous busy automotive business, wide cinematic frame showing complete transformation from empty to full'
  },
  'frame7-portrait-test': {
    'nano-banana-pro': 'Photorealistic close-up portrait of a male auto mechanic, mid-40s, weathered face with character lines, slight stubble, tired but determined eyes. Wearing dark blue work shirt with "Mike\'s Auto" embroidered on pocket, visible grease stains on shoulder and sleeves. Standing in auto repair shop with blurred tool cabinets and vehicles in background, warm overhead lighting creating dramatic shadows on face, shot on 85mm f/1.8 lens with shallow depth of field, professional portrait photography, highly detailed skin texture and fabric detail',
    'gpt-image-1.5': 'A photorealistic close-up portrait of a male automotive mechanic in his mid-40s. Weathered, masculine face showing years of hard work, slight salt-and-pepper stubble, focused eyes with crow\'s feet. Dark navy blue work shirt with grease stains on collar and chest, name patch visible. Standing inside auto repair garage with soft-focus tools and car lifts behind him, warm tungsten lighting from above creating depth and dimension, shot with 85mm portrait lens at f/1.8, professional studio-quality portrait, extreme detail in facial features and skin texture',
    'seedream-5.0-lite': 'Photorealistic portrait photograph of male auto mechanic, 45 years old, rugged weathered face showing experience, light stubble beard, strong jawline, tired but confident expression. Wearing dark blue automotive work shirt with visible grease marks and wear, standing in auto repair shop environment with blurred background of tools and vehicles, warm overhead shop lighting creating natural shadows, 85mm f/1.8 portrait lens with shallow depth of field, professional photography with highly detailed facial features, skin pores, and fabric texture visible'
  }
};

async function generateImage(model, prompt, frameName) {
  const outputPath = path.join(OUTPUT_DIR, model, `${frameName}.png`);
  
  console.log(`Generating ${model} - ${frameName}...`);
  
  try {
    const response = await fetch('https://api.kie.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIE_AI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'url'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Error for ${model} - ${frameName}:`, error);
      return { success: false, error };
    }
    
    const data = await response.json();
    const imageUrl = data.data[0].url;
    
    // Download image
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();
    
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    console.log(`✅ Saved: ${outputPath}`);
    return { success: true, path: outputPath };
    
  } catch (error) {
    console.error(`Error generating ${model} - ${frameName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function generateAllImages() {
  const results = [];
  
  for (const [frameName, prompts] of Object.entries(FRAMES)) {
    for (const [modelKey, modelName] of Object.entries(MODELS)) {
      const prompt = prompts[modelKey];
      const result = await generateImage(modelName, prompt, frameName);
      results.push({ model: modelName, frame: frameName, ...result });
      
      // Rate limit: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n=== GENERATION SUMMARY ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}/21`);
  console.log(`❌ Failed: ${failed}/21`);
  
  if (failed > 0) {
    console.log('\nFailed generations:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.model} / ${r.frame}: ${r.error}`);
    });
  }
  
  return results;
}

generateAllImages().then(() => {
  console.log('\n✅ All image generation complete!');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
