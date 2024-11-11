// types.ts
export type ImageData = {
  before_image: string;
  after_image: string;
};

export type ImagesResponse = {
  images: ImageData[];
};
