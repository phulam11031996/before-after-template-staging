import { useState, useEffect, useRef, CSSProperties } from "react";
import useImages from "./customHooks/useImages";
import { toPng } from "html-to-image";
import { base64ToBlob } from "./utils/helpers";
import { v4 as uuidv4 } from "uuid";

export default function ImageConcatenator() {
  const { imagesData, template, concatImageFilenames } = useImages();
  const [isDone, setIsDone] = useState<boolean>(false);

  const [templateImages, setTemplateImages] = useState<Blob[]>([]);
  const templateContainerRef = useRef<HTMLDivElement>(null);

  // Function to handle the export
  const handleExport = () => {
    const templateContainers = document.querySelectorAll(".template-container");
    for (let i = 0; i < templateContainers.length; i++) {
      toPng(templateContainers[i] as HTMLElement, {
        cacheBust: true,
        pixelRatio: 2,
      })
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
    <>
      {imagesData?.images.map((image, index) => (
        <div
          key={index}
          ref={templateContainerRef}
          className="template-container"
          style={{
            ...template?.outerContainer,
          }}
        >
          <div
            style={{
              ...template?.beforeImageContainer,
            }}
          >
            <img
              style={{ ...template?.beforeImage }}
              src={image.before_image}
              alt=""
            />
          </div>
          <div style={{ ...template?.afterImageContainer }}>
            <img
              style={{ ...template?.afterImage }}
              src={image.after_image}
              alt=""
            />
          </div>
          {template?.images &&
            template?.images.map(
              (
                element: {
                  src: string;
                  image: CSSProperties;
                  imageContainer: CSSProperties;
                },
                index: any,
              ) => (
                <div key={index} style={{ ...element.imageContainer }}>
                  <img style={{ ...element.image }} src={element.src} alt="" />
                </div>
              ),
            )}
          {template?.texts &&
            template?.texts.map((element: CSSProperties, index: any) => (
              <span key={index} style={{ ...element }}>
                {element.content}
              </span>
            ))}
          {template.divs &&
            template?.divs.map((element: CSSProperties, index: any) => (
              <div key={index} style={{ ...element }}></div>
            ))}
        </div>
      ))}
      {isDone && <span id="finish-concatenate">POST /upload-images send</span>}
    </>
  );
}
