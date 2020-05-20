import * as Yup from 'yup';
import {startOfDay, endOfDay, parseISO, isBefore} from 'date-fns';
import {Op} from "sequelize";
import Appointmet from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';

class ScheduleController {
  async index(req,res){
    const checkUserProvider = await User.findOne({
      where: {id: req.userId, provider: true},
    });

    if (!checkUserProvider){
      return res,status(401).json({error: 'User is not a provider.'});
    }
    const {date} = req.query;
    const parsedDate = parseISO(date);

    const appointment = await Appointmet.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]:[startOfDay(parsedDate), endOfDay(parsedDate),]
        },
      },
      order: ['date'],
      attributes: ['id', 'date'],
      include: [
        {
          model: User,
          as: 'user',
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
}
export default new ScheduleController();
