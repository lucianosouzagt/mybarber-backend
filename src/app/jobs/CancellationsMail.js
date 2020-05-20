import {format, parseISO} from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class CancellationMail{
  get key(){
    return 'CancellationMail';
  }
  async handle({data}){
    const {appointiment} = data;

    const date = format(parseISO(appointiment.date),"dd 'de' MMMM', às' H:mm'h'",{locale: pt,});

    await Mail.sendMail({
      to: `${appointiment.provider.name} <${appointiment.provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      html: `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height:1.6; color: #222; max-width: 600px;">
      <strong>Olá, ${appointiment.provider.name}</strong>
      <p>Houve um cancelamento de horário, confira os detalhes abaixo:</p>
      <p>
        <strong>Cliente: </strong> ${appointiment.user.name} <br/>
        <strong>Data/Hora: </strong> ${date}<br/>
        <br/>
        <small>
          O horário está novamente disponível para novos agenamentos.
        </small>
      </p>
      <hr/>
      <div style="text-align: center; font-size: 14px;margin: 0 auto;">Equipe <strong>GoBarber</strong></div>
      </div>`,
      /* context: {
        provider: appointiment.provider.name,
        user: appointiment.user.name,
        date: format(appointiment.date,"dd 'de' MMMM', às' H:mm'h'",{
          locale: pt,
        }),
      }, */
    });
  }
}
export default new CancellationMail();
