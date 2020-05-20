import * as Yup from 'yup';
import {startOfHour, parseISO, isBefore, format, subHours} from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointmet from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationsMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req,res){
    const {page = 1} = req.query;

    const appointment = await Appointmet.findAll({
      where: {user_id:req.userId, canceled_at: null,},
      order: ['date'],
      attributes: ['id', 'date','past','cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id','name','email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['path','url'],
            }
          ],
        }
      ],
    });

    return res.json(appointment);
  }

  async store(req,res){
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if(!(await schema.isValid(req.body))){
      return res.status(400).json({error: 'Validation fails.'})
    }

    const {provider_id, date} = req.body;

    /**
     * Checando se eu um prestador de serviços
     */
    const isProvider = await User.findOne({
      where: {id: provider_id, provider: true},
    });

    if(!isProvider){
      return res
        .status(401)
        .json({error: 'You can only appointment with providers.'});
    }
    /**
     * Checando se a hora ja passou
     */
    const hourStart = startOfHour(parseISO(date));

    if(isBefore(hourStart, new Date())){
      return res.status(400).json({error: 'Past dates are not permitted.'})
    }
    /**
     * Checando se o prestador ja tem agendamento nesse horario
     */

    const checkAvailability = await Appointmet.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      }
    })

    if(checkAvailability){
      return res.status(400).json({error: 'Appointment date is not available.'})
    }
    if(provider_id === req.userId){
      return res.status(400).json({error: 'Provider and user cannot be the same.'})
    }


    const appointment = await Appointmet.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /**
     * Notify appointiment provider
     */
    const user = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      {locale:pt}
    );


    await Notification.create({
      content: `Novo agendamemto de ${user.name} para ${formattedDate}`,
      user: provider_id,

    });

    return res.json(appointment);
  }

  async delete(req,res){
    const appointiment = await Appointmet.findByPk(req.params.id,{
      include: [
        {
        model: User,
        as: 'provider',
        attributes: ['name','email'],
        },
        {
          model:User,
          as: 'user',
          attributes: ['name'],
        }
      ]
    });

    if(appointiment.user_id != req.userId){
      return res.status(401).json({error: "You don't have permission to cancel this appointment."});
    }
    const dateWithSub = subHours(appointiment.date, 2);

    if(isBefore(dateWithSub, new Date())){
      return res.status(401).json({error: 'You can only cancel appointments 2 hours in advance.'});
    }

    appointiment.canceled_at = new Date();
    await appointiment.save();

    await Queue.add(CancellationMail.key, {
      appointiment,
    });
    return res.json(appointiment);
  }
}

export default new AppointmentController();
