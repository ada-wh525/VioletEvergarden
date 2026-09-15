// Shared by the homepage and the typewriter room. Generated locally; no upload is needed.
const drawTrackedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) => {
  let cursor = x;
  Array.from(text).forEach((character) => {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + tracking;
  });
};

const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  text.split("\n").forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    Array.from(paragraph).forEach((character) => {
      const nextLine = `${line}${character}`;
      if (line && context.measureText(nextLine).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = nextLine;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
};

export async function createLetterKeepsake({ text, author, section, preview, themeLabel, addressee = "Dear Violet,", note = "" }: {
  text: string; author: string; section: HTMLElement; preview: HTMLElement;
  themeLabel: string; addressee?: string; note?: string;
}): Promise<Blob> {
  await document.fonts.ready;
  const sectionStyle = getComputedStyle(section);
  const previewStyle = getComputedStyle(preview);
  const palette = {
    background: sectionStyle.getPropertyValue("--letter-section-bg").trim() || "#d8dce2",
    paper: sectionStyle.getPropertyValue("--letter-paper").trim() || "#f5f2eb",
    ink: sectionStyle.getPropertyValue("--letter-ink").trim() || "#263e62",
    accent: sectionStyle.getPropertyValue("--letter-accent").trim() || "#263e62",
    accentSoft: sectionStyle.getPropertyValue("--letter-accent-soft").trim() || "#91afc2",
    seal: sectionStyle.getPropertyValue("--letter-seal").trim() || "#263e62",
  };
  const fontFamily = previewStyle.fontFamily || '"Cormorant Garamond", "Noto Sans SC", serif';
  const isItalic = sectionStyle.getPropertyValue("--letter-font-style").trim() === "italic";
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.font = `${isItalic ? "italic " : ""}400 34px ${fontFamily}`;
  const lines = wrapCanvasText(context, text, 848);
  canvas.height = Math.max(1600, 480 + Math.max(0, lines.length - 1) * 61 + 400);

  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 0.08;
  context.strokeStyle = palette.accent;
  context.lineWidth = 1;
  for (let y = 20; y < canvas.height; y += 28) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y + 38);
    context.stroke();
  }
  context.globalAlpha = 1;

  const paperX = 86;
  const paperY = 70;
  const paperWidth = 1028;
  const paperHeight = canvas.height - 140;
  context.shadowColor = "rgba(35, 31, 28, 0.18)";
  context.shadowBlur = 45;
  context.shadowOffsetY = 20;
  context.fillStyle = palette.paper;
  context.fillRect(paperX, paperY, paperWidth, paperHeight);
  context.shadowColor = "transparent";
  context.globalAlpha = 0.26;
  context.strokeStyle = palette.accent;
  context.lineWidth = 2;
  context.strokeRect(paperX + 24, paperY + 24, paperWidth - 48, paperHeight - 48);
  context.globalAlpha = 1;

  context.save();
  context.beginPath();
  context.rect(paperX, paperY, paperWidth, 14);
  context.clip();
  for (let x = paperX - 50, index = 0; x < paperX + paperWidth + 50; x += 54, index += 1) {
    context.fillStyle = index % 2 === 0 ? palette.accent : palette.accentSoft;
    context.beginPath();
    context.moveTo(x, paperY);
    context.lineTo(x + 30, paperY);
    context.lineTo(x + 18, paperY + 14);
    context.lineTo(x - 12, paperY + 14);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.fillStyle = palette.accent;
  context.font = `600 18px ${fontFamily}`;
  drawTrackedText(context, "LEIDENSCHAFTLICH · C.H. POSTAL", 176, 178, 4.2);
  context.textAlign = "right";
  context.globalAlpha = 0.65;
  context.font = `500 17px ${fontFamily}`;
  context.fillText(themeLabel, 1024, 178);
  context.textAlign = "left";
  context.globalAlpha = 1;

  context.strokeStyle = palette.accent;
  context.globalAlpha = 0.2;
  context.beginPath();
  context.moveTo(176, 222);
  context.lineTo(1024, 222);
  context.stroke();
  context.globalAlpha = 1;

  context.fillStyle = palette.accent;
  context.font = `italic 500 66px ${fontFamily}`;
  context.fillText(addressee, 176, 355, 848);

  context.fillStyle = palette.ink;
  context.font = `${isItalic ? "italic " : ""}400 34px ${fontFamily}`;
  lines.forEach((line, index) => {
    context.fillText(line, 176, 480 + index * 61);
  });

  context.textAlign = "right";
  context.fillStyle = palette.accent;
  context.font = `italic 500 37px ${fontFamily}`;
  context.fillText(author, 1018, canvas.height - 312, 848);
  context.textAlign = "left";

  const sealX = 600;
  const sealY = canvas.height - 210;
  const sealRadius = 67;
  const sealGradient = context.createRadialGradient(sealX - 20, sealY - 22, 8, sealX, sealY, sealRadius);
  sealGradient.addColorStop(0, palette.accentSoft);
  sealGradient.addColorStop(0.45, palette.seal);
  sealGradient.addColorStop(1, palette.ink);
  context.fillStyle = sealGradient;
  context.beginPath();
  context.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.55;
  context.strokeStyle = palette.paper;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(sealX, sealY, 50, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = palette.paper;
  context.textAlign = "center";
  context.font = `normal 500 55px ${fontFamily}`;
  context.fillText("V", sealX, sealY + 17);

  context.fillStyle = palette.accent;
  context.globalAlpha = 0.55;
  context.font = `500 15px ${fontFamily}`;
  context.fillText("LETTERS FROM THE HEART  ·  VIOLETEVER.GARDEN", sealX, canvas.height - 110);
  context.globalAlpha = 1;
  context.textAlign = "left";

  if (note) {
    context.textAlign = "center";
    context.font = `400 16px ${fontFamily}`;
    context.fillText(note, 600, canvas.height - 35, 1040);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png");
  });
}
