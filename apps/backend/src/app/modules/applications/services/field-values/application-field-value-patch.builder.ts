import { Injectable } from '@nestjs/common';
import { ApplicationFieldValue } from '../../../../../models/entities/application-field-value.entity';
import type { Application } from '../../../../../models/entities/application.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';
import type { ApplicationPatchContext } from './application-patch-context.loader';

/**
 * 申請更新DTOの values を既存フィールド値への差分として組み立てる builder。
 */
@Injectable()
export class ApplicationFieldValuePatchBuilder {
  constructor(
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  /**
   * 更新値をフォーム定義・差し戻し対象に照合し、保存対象のフィールド値を返す。
   * @param context 申請更新コンテキスト
   * @param values 更新値
   * @param existingValues 既存フィールド値
   * @returns 保存対象のフィールド値
   */
  build(
    context: ApplicationPatchContext,
    values: Record<string, unknown>,
    existingValues: ApplicationFieldValue[],
  ): ApplicationFieldValue[] {
    this.formValueValidator.assertPatchValuesMatchFields(
      context.fieldsByKey,
      values,
      context.allowedFieldIds,
    );

    const existingByFieldId = new Map(
      existingValues.map((value) => [value.formFieldId, value]),
    );
    const patchedValues: ApplicationFieldValue[] = [];

    for (const [key, val] of Object.entries(values)) {
      const field = this.formValueValidator.getKnownField(
        context.fieldsByKey,
        key,
      );
      const existing = existingByFieldId.get(field.id);
      if (existing) {
        existing.valueJson = val;
        patchedValues.push(existing);
      } else {
        patchedValues.push(this.createFieldValue(context.app, field, val));
      }
    }

    return patchedValues;
  }

  /**
   * 新規フィールド値 entity を作成する。
   * @param app 申請
   * @param field フォームフィールド
   * @param valueJson 入力値
   * @returns フィールド値 entity
   */
  private createFieldValue(
    app: Application,
    field: FormField,
    valueJson: unknown,
  ): ApplicationFieldValue {
    const value = new ApplicationFieldValue();
    value.tenantId = app.tenantId;
    value.applicationId = app.id;
    value.formFieldId = field.id;
    value.valueJson = valueJson;
    return value;
  }
}
