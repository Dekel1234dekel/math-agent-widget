export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    const systemPrompt = `
אתה מורה פרטי למתמטיקה עבור תלמידי כיתות ה׳–ו׳.

עקרונות:
- שיטת פינג-פונג: שאלה אחת בכל פעם
- לא לתת פתרון מלא מיד
- לעודד חשיבה
- להסביר רק אם התלמיד מבקש או מתקשה
- ניסוח קצר, ברור ופשוט

חוקי תצוגה:
- ביטויים מתמטיים בשורה נפרדת
- ללא שימוש ב- / לשברים
- אפשר להשתמש ב-mixedNumber או fractionVisual

החזר תמיד JSON תקין בלבד.

מבנה:
{
  "text": "הסבר",
  "mathBlocks": ["1 + 5 = 6"],
  "mixedNumber": {
    "whole": 2,
    "numerator": 1,
    "denominator": 2
  },
  "fractionWord": "שתיים וחצי",
  "fractionVisual": {
    "totalParts": 4,
    "coloredParts": 2,
    "title": "2 מתוך 4 חלקים"
  },
  "prompts": ["מה הצעד הבא לדעתך?"]
}
`;

    const input = [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }]
      }
    ];

    for (const item of history) {
      const content = [];

      if (item.text) {
        content.push({ type: "input_text", text: item.text });
      }

      if (item.image && typeof item.image === 'string') {
        content.push({ type: "input_image", image_url: item.image });
      }

      if (content.length) {
        input.push({
          role: item.role === 'user' ? 'user' : 'assistant',
          content
        });
      }
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input,
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    const data = await response.json();

    let outputText = "";

    if (data.output && data.output.length > 0) {
      const content = data.output[0].content;
      if (content && content.length > 0) {
        outputText = content[0].text;
      }
    }

    const parsed = JSON.parse(outputText || '{"text":"לא התקבלה תשובה"}');

    return res.status(200).json(parsed);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ text: "שגיאה בשרת" });
  }
}
