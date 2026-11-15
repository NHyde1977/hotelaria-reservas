
import { criarBarreiraConcorrencia } from './barreira-concorrencia';

describe('Barreira de concorrência', () => {
  it('deve liberar duas operações quando ambas chegarem', async () => {
    const barreira = criarBarreiraConcorrencia(2, 1000);
    const ordem: string[] = [];

    const operacaoA = async () => {
      ordem.push('A chegou');
      await barreira.aguardar();
      ordem.push('A liberada');
    };

    const operacaoB = async () => {
      ordem.push('B chegou');
      await barreira.aguardar();
      ordem.push('B liberada');
    };

    await Promise.all([operacaoA(), operacaoB()]);

    expect(ordem.slice(0, 2)).toEqual([
      'A chegou',
      'B chegou',
    ]);

    expect(ordem).toContain('A liberada');
    expect(ordem).toContain('B liberada');
  });

  it('deve rejeitar a espera quando faltar um participante', async () => {
    const barreira = criarBarreiraConcorrencia(2, 50);

    await expect(barreira.aguardar()).rejects.toThrow(
      'Timeout: apenas 1 de 2 participantes chegaram à barreira.',
    );
  });
});
