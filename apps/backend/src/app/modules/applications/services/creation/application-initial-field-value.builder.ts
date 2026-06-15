import { Injectable } from '@nestjs/common';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import type { CreateApplicationValue } from '../../../../../models/repositories/application-creation.repository';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';

/**
 * 申請作成時の入力値を永続化用のフィールド値へ変換する builder。
 */
@Injectable()
export class ApplicationInitialFieldValueBuilder {
  constructor(
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  /**
   * 入力値をフォーム定義に照合し、作成用フィールド値を組み立てる。
   * @param template フォーム定義
   * @param values 入力値
   * @returns 作成用フィールド値
   */
  build(
    template: FormDefinition,
    values: Record<string, unknown>,
  ): CreateApplicationValue[] {
    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    this.formValueValidator.assertValuesMatchFields(fieldsByKey, values);

    return Object.entries(values).map(([key, val]) => {
      const field = this.formValueValidator.getKnownField(fieldsByKey, key);
      return {
        formFieldId: field.id,
        valueJson: val,
      };
    });
  }
}
