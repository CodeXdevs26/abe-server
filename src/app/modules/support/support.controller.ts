import handleAsyncRequest from '../../utils/handleAsyncRequest'
import { successResponse } from '../../utils/successResponse'
import { supportService } from './support.service';

const sendMessage = handleAsyncRequest(async (req, res) => { 
  const data = req.body;
  const result = await supportService.sendMessage(data)
  successResponse(res, {
    message: 'Message sent successfully!',
    data: result,
  })
})

const supportController = {
  sendMessage,
}

export default supportController
