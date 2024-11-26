// types.ts
export type ImageData = {
  before_image: string;
  after_image: string;
  template_width: number;
  template_height: number;
};

export type ImagesResponse = {
  images: ImageData[];
};
