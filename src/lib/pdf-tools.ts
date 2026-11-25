import { PDFDocument } from "pdf-lib";
import { canvasToBlob, loadImage } from "@/lib/image-tools";

export function pdfBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: "application/pdf" });
}

async function openPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

async function renderPage(file: File, scale: number, quality: number) {
  const document = await openPdf(file);
  const pages: { blob: Blob; width: number; height: number }[] = [];

  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const points = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    pages.push({
      blob: await canvasToBlob(canvas, "image/jpeg", quality),
      width: points.width,
      height: points.height,
    });
  }

  await document.cleanup();
  return pages;
}

export async function compressPdf(file: File, scale: number, quality: number) {
  const pages = await renderPage(file, scale, quality);
  const document = await PDFDocument.create();

  for (const page of pages) {
    const image = await document.embedJpg(new Uint8Array(await page.blob.arrayBuffer()));
    const pdfPage = document.addPage([page.width, page.height]);
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    });
  }

  return pdfBlob(await document.save());
}

export async function pdfPagesToImages(file: File) {
  const pages = await renderPage(file, 1.6, 0.85);
  return pages.map((page) => page.blob);
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 36;

export async function mergeDocuments(files: File[]) {
  if (files.length < 2) {
    throw new Error("Add at least two files.");
  }
  const document = await PDFDocument.create();

  for (const file of files) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      await addPdf(document, file);
    } else {
      await addImagePage(document, file);
    }
  }

  if (document.getPageCount() < 1) {
    throw new Error("Those files did not contain any pages.");
  }
  return pdfBlob(await document.save());
}

async function addPdf(document: PDFDocument, file: File) {
  const bytes = await file.arrayBuffer();
  try {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const indices = source.getPageIndices();
    if (indices.length === 0) {
      throw new Error("That PDF has no pages.");
    }
    const copied = await document.copyPages(source, indices);
    copied.forEach((page) => document.addPage(page));
    return;
  } catch (error) {
    try {
      const pages = await renderPage(file, 1.5, 0.86);
      if (pages.length === 0) {
        throw error;
      }
      for (const page of pages) {
        const image = await document.embedJpg(new Uint8Array(await page.blob.arrayBuffer()));
        const pdfPage = document.addPage([page.width, page.height]);
        pdfPage.drawImage(image, { x: 0, y: 0, width: page.width, height: page.height });
      }
    } catch {
      const reason = error instanceof Error ? error.message : "Could not read that PDF.";
      throw new Error(`Could not add ${file.name}. ${reason}`);
    }
  }
}

async function addImagePage(document: PDFDocument, file: File) {
  let image;
  try {
    image = await embedImage(document, file);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not read that image.";
    throw new Error(`Could not add ${file.name}. ${reason}`);
  }
  const page = document.addPage([A4_WIDTH, A4_HEIGHT]);
  const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const maxHeight = A4_HEIGHT - PAGE_MARGIN * 2;
  const naturalWidth = (image.width / 144) * 72;
  const naturalHeight = (image.height / 144) * 72;
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  page.drawImage(image, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  });
}

async function embedImage(document: PDFDocument, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  try {
    if (file.type === "image/png" || name.endsWith(".png")) {
      return await document.embedPng(bytes);
    }
    if (file.type === "image/jpeg" || file.type === "image/jpg" || /\.jpe?g$/i.test(name)) {
      return await document.embedJpg(bytes);
    }
  } catch {
    // Scanned JPEGs are often CMYK, which this PDF library cannot embed directly.
  }
  const image = await loadImage(file);
  const canvas = window.document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare an image for the PDF.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  return document.embedJpg(new Uint8Array(await blob.arrayBuffer()));
}
