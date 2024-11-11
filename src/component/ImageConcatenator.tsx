import { useState, useEffect, useRef } from "react";
import useImages from "./customHooks/useImages";
import { toPng } from "html-to-image";
import { base64ToBlob } from "./utils/helpers";
import "./ImageConcatenator.css";
import { v4 as uuidv4 } from "uuid";

const TEMPLATE_WIDTH = "500px";

export default function ImageConcatenator() {
  const { imagesData, template, concatImageFilenames } = useImages();
  const [isDone, setIsDone] = useState<boolean>(false);

  const [templateImages, setTemplateImages] = useState<Blob[]>([]);
  const templateContainerRef = useRef<HTMLDivElement>(null);

  // Function to handle the export
  const handleExport = () => {
    const templateContainers = document.querySelectorAll(".template-container");
    for (let i = 0; i < templateContainers.length; i++) {
      toPng(templateContainers[i] as HTMLElement, { cacheBust: true })
        .then((dataUrl) => {
          const imageBlob = base64ToBlob(dataUrl);
          setTemplateImages((prev) => [...prev, imageBlob]);
        })
        .catch((error) => {
          console.error("Error exporting image:", error);
        });
    }
  };

  useEffect(() => {
    handleExport();
  }, [imagesData]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const formData = new FormData();
        templateImages.forEach((image, index) => {
          // Convert blob to file if necessary
          const fileName =
            index < concatImageFilenames.length
              ? concatImageFilenames[index]
              : `${uuidv4()}.jpg`;

          const file =
            image instanceof Blob
              ? new File([image], fileName, {
                  type: image.type,
                })
              : image;
          formData.append("images", file);
        });
        const response = await fetch("http://localhost:8000/upload-images", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Network response was not ok");
        }
      } catch (error) {
        console.error("Upload failed:");
      } finally {
        setIsDone(true);
      }
    };
    if (!imagesData) return;
    if (templateImages.length === imagesData.images.length) fetchImages();
  }, [templateImages, imagesData, concatImageFilenames]);

  if (!template) return null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "grey",
        overflow: "auto",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
      }}
    >
      {imagesData?.images.map((image, index) => {
        return (
          <div
            style={{
              width: TEMPLATE_WIDTH,
              height: TEMPLATE_WIDTH,
              position: "relative",
              ...template?.outerContainer,
            }}
            className="template-container"
            ref={templateContainerRef}
            key={index}
          >
            <div
              style={{
                ...template?.beforeImageContainer,
              }}
              className="image-container"
            >
              <img
                style={{ ...template?.beforeImage }}
                src={image.before_image}
                alt="before"
              />
            </div>
            <div
              style={{ ...template?.afterImageContainer }}
              className="image-container"
            >
              <img
                style={{ ...template?.afterImage }}
                src={image.after_image}
                alt="after"
              />
            </div>
            {template?.watermarkImage?.src && (
              <div
                style={{
                  ...template?.watermarkImageContainer,
                }}
                className="image-container"
              >
                <img
                  style={{ ...template?.watermarkImage }}
                  // TODO: Replace default watermark with clinicos watermark url to prevent single point of failure
                  // POINT THIS OUT TO ABATE THIS IS IMPORTANT
                  src={template?.watermarkImage?.src ?? ""}
                  alt="watermark"
                />
              </div>
            )}
            <span
              style={{
                ...template?.beforeText,
              }}
              className="text"
            >
              {template?.beforeText?.textContent || "Before"}
            </span>
            <span
              style={{
                ...template?.afterText,
              }}
              className="text"
            >
              {template?.afterText?.textContent || "After"}
            </span>
          </div>
        );
      })}
      <button onClick={handleExport}>Export as Image</button>
      <button onClick={() => {}}>Save Template</button>
      <pre
        style={{ background: "white", padding: "20px", width: TEMPLATE_WIDTH }}
      >
        {JSON.stringify(template, null, 2)}
      </pre>
      {isDone && <span id="finish-concatenate">POST /upload-images send</span>}
    </div>
  );
}
