import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import type {
  UploadApiResponse,
  v2 as CloudinaryType,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: typeof CloudinaryType,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new InternalServerErrorException(
        'Nenhum arquivo foi recebido para upload.',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(
              new InternalServerErrorException(
                `Erro ao enviar arquivo para o Cloudinary: ${error.message}`,
              ),
            );
            return;
          }

          if (!result) {
            reject(
              new InternalServerErrorException(
                'O Cloudinary não retornou os dados do arquivo enviado.',
              ),
            );
            return;
          }

          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(
    publicId: string | null | undefined,
    resourceType: 'image' | 'raw' | 'video' = 'image',
  ): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      await this.cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Erro ao excluir arquivo do Cloudinary: ${
          error?.message || 'erro desconhecido'
        }`,
      );
    }
  }
}