
import { Quarto } from '../integracoes/quartos/quarto.interface';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { ReservasService } from './reservas.service';

describe('ReservasService - orquestração da criação', () => {
  const dto: CriarReservaDto = {
    quartoId: '1',
    dataPrevisaoCheckin: '2026-12-10',
    dataPrevisaoCheckout: '2026-12-13',
    hospedes: [],
  };

  const quarto: Quarto = {
    id: '1',
    id_tipo_quarto: '3',
    numero: 101,
    status: 'ATIVO',
    disponibilidade: 'DISPONIVEL',
    tipo_quarto: {
      id: '3',
      nome: 'Duplo',
      capacidade_maxima: 2,
      preco_diaria: '350.00',
    },
  };

  let service: ReservasService;

  beforeEach(() => {
    service = Object.create(ReservasService.prototype) as ReservasService;
  });

  it('deve validar, persistir e formatar a reserva nesta ordem', async () => {
    const ordem: string[] = [];

    const reservaCriada = { id: 'reserva-teste' };
    const respostaFormatada = {
      id: 'reserva-teste',
      quarto_id: '1',
    };

    const validar = jest
      .spyOn(service, 'validarDadosCriacao')
      .mockImplementation(async () => {
        ordem.push('validar');

        return {
          valido: true,
          mensagem:
            'Validações locais, de usuários e de quarto realizadas com sucesso.',
          quarto,
        };
      });

    const persistir = jest
      .spyOn(service, 'persistirReservaValidada')
      .mockImplementation(async () => {
        ordem.push('persistir');
        return reservaCriada as never;
      });

    const formatar = jest
      .spyOn(service, 'formatarRespostaReserva')
      .mockImplementation(() => {
        ordem.push('formatar');
        return respostaFormatada as never;
      });

    const resultado = await service.criarReserva(dto);

    expect(ordem).toEqual(['validar', 'persistir', 'formatar']);

    expect(validar).toHaveBeenCalledWith(dto);
    expect(persistir).toHaveBeenCalledWith(dto, quarto);
    expect(formatar).toHaveBeenCalledWith(reservaCriada);

    expect(resultado).toBe(respostaFormatada);
  });

  it('não deve persistir quando a validação falhar', async () => {
    const erroValidacao = new Error('Reserva inválida');

    jest
      .spyOn(service, 'validarDadosCriacao')
      .mockRejectedValue(erroValidacao);

    const persistir = jest.spyOn(
      service,
      'persistirReservaValidada',
    );

    await expect(service.criarReserva(dto)).rejects.toBe(
      erroValidacao,
    );

    expect(persistir).not.toHaveBeenCalled();
  });
});
