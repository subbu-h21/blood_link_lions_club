// v2 - photoreal direction, per feedback that v1 (flat vector icons) felt
// plain, too abstract/empty, and too muted. Still bound to the site's
// actual brand palette (frontend/app/globals.css: blood #b3223d/#c53856,
// banyan #237a56/#1f6f4f, soil #b3541e/#9a3412, paper/sand #fbf8f4) via
// color-grading direction rather than flat fills.
//
// These are generic donation-scene photography, the same convention real
// blood banks/NGOs use with stock photography - not framed as "our actual
// donors/camp" anywhere in copy or alt text once these are wired in.
//
// "No text/logos/signage" is prompted deliberately: photoreal generations
// hallucinate garbled text on background objects (signs, badges, papers)
// even when nobody asked for text - suppress it at the source rather than
// crop it out after.
const STYLE =
  "photorealistic photography, natural warm lighting, shallow depth of " +
  "field, candid documentary style, South Indian setting, color grading " +
  "toward deep red (#b3223d), forest green (#237a56) and warm amber " +
  "(#b3541e) accents in clothing/props/lighting against warm neutral " +
  "tones, shot on a professional camera, high detail, no text, no logos, " +
  "no readable signage, no watermarks";

export const prompts = {
  hero: {
    prompt:
      `A warm, candid photograph of a young Indian blood donor mid-donation ` +
      `in a clean community blood-donation camp, lying back relaxed with a ` +
      `slight smile, a nurse's gloved hand steadying the donation line, soft ` +
      `golden-hour light through a tent or window. ${STYLE}. Composition ` +
      `has natural negative space toward the upper-left for a headline, but ` +
      `the frame should feel full and alive, not empty.`,
    aspect_ratio: "16:9",
  },

  howItWorks1Search: {
    prompt:
      `A close, warm photograph of a person's hands holding a smartphone ` +
      `outdoors in an Indian town, clearly checking something on the ` +
      `screen with a focused, hopeful expression, soft bokeh street/market ` +
      `background. ${STYLE}. Screen content stays abstract/blurred, not ` +
      `readable.`,
    aspect_ratio: "1:1",
  },

  howItWorks2Request: {
    prompt:
      `A warm, emotional photograph of a worried family member making a ` +
      `phone call, one hand pressed to the phone, in a hospital corridor ` +
      `with soft warm lighting, conveying urgency but not despair - hope is ` +
      `visible in the expression. ${STYLE}.`,
    aspect_ratio: "1:1",
  },

  howItWorks3Match: {
    prompt:
      `A warm photograph of a smiling volunteer sitting at a small desk, ` +
      `talking on a phone, a notebook and pen in front of them, a community ` +
      `hall softly out of focus behind them. ${STYLE}.`,
    aspect_ratio: "1:1",
  },

  howItWorks4Donate: {
    prompt:
      `A close warm photograph of a blood donation bag filling during ` +
      `donation, soft focus on the donor's arm in the background, deep red ` +
      `blood visible in the tube against clean clinical white and warm ` +
      `ambient light. ${STYLE}.`,
    aspect_ratio: "1:1",
  },

  missionBanner: {
    prompt:
      `A wide, lively photograph of a community blood donation camp in a ` +
      `small Indian town - several donors on cots mid-donation, volunteers ` +
      `and nurses moving between them, warm bunting/fabric in red and green ` +
      `tones strung overhead, golden-hour light, a genuine sense of a whole ` +
      `community turning out to help. ${STYLE}. Wide banner composition, ` +
      `full and busy, minimal empty sky.`,
    aspect_ratio: "21:9",
  },
};
