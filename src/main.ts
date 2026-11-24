import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new BigIntInterceptor());

  const config = new DocumentBuilder()
    .setTitle('API de Reservas — Hotelaria')
    .setDescription('Microsserviço responsável pelo gerenciamento de reservas.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  const rabbitmqUrl = process.env.RABBITMQ_URL;

  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'reservas_pagamentos',
        queueOptions: {
          durable: true,
          deadLetterExchange: '',
          deadLetterRoutingKey: 'reservas_pagamentos_dlq',
        },
        noAck: false,
        prefetchCount: 1,
      },
    });

    await app.startAllMicroservices();
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();