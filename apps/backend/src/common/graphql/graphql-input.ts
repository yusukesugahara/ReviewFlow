import { BadRequestException, type Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export function toValidatedInput<T extends object>(
  dtoClass: Type<T>,
  value: unknown,
): T {
  const instance = plainToInstance(dtoClass, value ?? {});
  const errors = validateSync(instance, {
    forbidNonWhitelisted: true,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }

  return instance;
}
