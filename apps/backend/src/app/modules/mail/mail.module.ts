import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailMessageFactory } from './services/mail-message.factory';
import { MailService } from './services/mail.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService, MailMessageFactory],
  exports: [MailService],
})
export class MailModule {}
