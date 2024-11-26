import { CSSProperties, useEffect, useState } from "react";
import { ImagesResponse } from "../utils/types";

const TEMPLATE_PARAM_KEY = "template";
const PAIRED_IMAGE_PATHS_PARAM_KEY = "paired_image_paths";
const CONCAT_IMAGE_FILENAMES_PARAM_KEY = "concat_image_filenames";
const TEMPLATE_WIDTH = 1000;
const TEMPLATE_HEIGHT = 1000;

const calculateTemplateWidth = (
  templateDefinition: TemplateT,
  imageSrc: string,
): Promise<{ imageWidth: number; imageHeight: number }> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        if (
          typeof templateDefinition.beforeImageContainer.width === "number" ||
          (typeof templateDefinition.beforeImageContainer.width === "string" &&
            !templateDefinition.beforeImageContainer.width.includes("%"))
        ) {
          throw new Error(
            "Template width is a number, expected string and should be a percentage value",
          );
        }

        const pictureAspectRatio = img.naturalWidth / img.naturalHeight;

        const templateImageWidth: number =
          typeof templateDefinition.beforeImageContainer.width === "string"
            ? parseFloat(
                templateDefinition.beforeImageContainer.width.replace("%", ""),
              )
            : 0;

        const templateImageHeight: number =
          typeof templateDefinition.beforeImageContainer.height === "string"
            ? parseFloat(
                templateDefinition.beforeImageContainer.height.replace("%", ""),
              )
            : 0;
        const templateAspectRatio = templateImageWidth / templateImageHeight;

        const templateImageWidthPx: number =
          typeof templateDefinition.beforeImageContainer.width === "string" &&
          templateDefinition.beforeImageContainer.width.includes("%")
            ? (parseFloat(
                templateDefinition.beforeImageContainer.width.replace("%", ""),
              ) *
                TEMPLATE_WIDTH) /
              100
            : 0;

        const borderHorizontalPx: number =
          typeof templateDefinition.outerContainer.borderWidth === "string"
            ? 2 *
              parseFloat(
                templateDefinition.outerContainer.borderWidth.replace("px", ""),
              )
            : typeof templateDefinition.outerContainer.borderWidth === "number"
              ? 2 * templateDefinition.outerContainer.borderWidth
              : 0;

        const unusedWidthPx =
          TEMPLATE_WIDTH -
          Math.min(templateImageWidthPx + templateImageWidthPx, 1000);

        const result =
          TEMPLATE_WIDTH * (pictureAspectRatio / templateAspectRatio) +
          unusedWidthPx * (pictureAspectRatio / templateAspectRatio) +
          borderHorizontalPx;
        const imageWidth = Math.floor(result);

        console.log("result", result);
        console.log("borderHorizontalPx", borderHorizontalPx);

        resolve({
          imageWidth,
          imageHeight: TEMPLATE_HEIGHT + borderHorizontalPx,
        });
      } catch (error) {
        console.log("Error calculating template width", error);
      }
    };

    img.onerror = () => {
      throw new Error("Image failed to load while calculating template width");
    };

    img.src = imageSrc;
  });
};

// IMPORTANT NOTE: For the next developer, this is the type of the template object
// follow this type when creating a new template
export type TemplateT = {
  beforeImageContainer: CSSProperties;
  afterImageContainer: CSSProperties;
  outerContainer: CSSProperties;
  beforeImage: CSSProperties;
  afterImage: CSSProperties;
  texts: CSSProperties[];
  images: {
    src: string; // IMPORTANT NOTE: If there is a CORS issue with the image src, the concatenation will fail
    image: CSSProperties;
    imageContainer: CSSProperties;
  }[];
  divs: CSSProperties[];
};

// TODO: Come up with a better name for this hook
const useImages = () => {
  const [imagesData, setImagesData] = useState<ImagesResponse | null>(null);
  const [template, setTemplate] = useState<TemplateT | null>(null);
  const [concatImageFilenames, setConcatImageFilenames] = useState<string[]>(
    [],
  );

  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pairedImagePaths = params.get(PAIRED_IMAGE_PATHS_PARAM_KEY) ?? "";
        const template = params.get(TEMPLATE_PARAM_KEY) ?? "";
        const concatImageFilenames =
          params.get(CONCAT_IMAGE_FILENAMES_PARAM_KEY) ?? "";
        setTemplate(JSON.parse(template));
        setConcatImageFilenames(JSON.parse(concatImageFilenames));

        const response = await fetch(
          `http://localhost:8000/images${`?${PAIRED_IMAGE_PATHS_PARAM_KEY}=${encodeURIComponent(pairedImagePaths)}`}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Calculate template width for each image
        const templateWidthsAndHeights = await Promise.all(
          data.images.map(
            async (image: { before_image: string; after_image: string }) => {
              const templateWidth = await calculateTemplateWidth(
                JSON.parse(template),
                image.before_image,
              );

              return {
                before_image: image.before_image,
                after_image: image.after_image,
                template_width: templateWidth.imageWidth,
                template_height: templateWidth.imageHeight,
              };
            },
          ),
        );

        setImagesData({ images: templateWidthsAndHeights });
      } catch (error) {
        console.error(error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  return { imagesData, template, concatImageFilenames, error, loading };
};

export default useImages;
