
export function criarBarreiraConcorrencia(
  participantes: number,
  timeoutMs = 5000,
) {
  let chegaram = 0;
  let liberar!: () => void;
  let rejeitar!: (erro: Error) => void;

  const liberacao = new Promise<void>((resolve, reject) => {
    liberar = resolve;
    rejeitar = reject;
  });

  const timeout = setTimeout(() => {
    rejeitar(
      new Error(
        `Timeout: apenas ${chegaram} de ${participantes} participantes chegaram à barreira.`,
      ),
    );
  }, timeoutMs);

  return {
    async aguardar(): Promise<void> {
      chegaram++;

      if (chegaram === participantes) {
        clearTimeout(timeout);
        liberar();
      }

      await liberacao;
    },

    cancelar(): void {
      clearTimeout(timeout);
      rejeitar(new Error('Barreira de concorrência cancelada.'));
    },
  };
}
