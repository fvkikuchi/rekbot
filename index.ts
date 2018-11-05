import * as awsSdk from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';

const AWS = AWSXRay.captureAWS(awsSdk);
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

import { APIGatewayProxyHandler, Handler } from 'aws-lambda';
import fetch from 'node-fetch';
import Jimp = require('jimp');
import { promisify, inspect } from 'util';
import 'source-map-support/register';

type AsyncInvoke =
  (params: AWS.Lambda.Types.InvocationRequest) => Promise<AWS.Lambda.Types.InvocationResponse>;
const SLACK_URL = 'https://slack.com/api';
const {
  ACCESS_TOKEN,
  VERIFICATION_TOKEN,
  REGION,
  BUCKET_NAME,
  HANDLE_FILE,
} = process.env;

const MAX_IMAGE_SIZE = 5000000; // 5 * 1024 * 1024;

AWS.config.update({ region: REGION });
const rekognition = new AWS.Rekognition();
const detectFaces = promisify(rekognition.detectFaces.bind(rekognition));
const s3 = new AWS.S3();
const putObject = promisify(s3.putObject.bind(s3));
const lambda = new AWS.Lambda();
const invoke: AsyncInvoke = promisify(lambda.invoke.bind(lambda));

const getS3Url = (region: string, bucket: string, key: string) => {
  let host: string;
  if (region === 'us-east-1') {
    host = 's3.amazonaws.com';
  } else {
    host = `s3-${region}.amazonaws.com`;
  }
  return `https://${host}/${bucket}/${key}`;
};

const postMessage = async (msg: Slack.ChatPostMessage) => {
  return await fetch(`${SLACK_URL}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(msg),
  });
};

const detailToFields = (detail: AWS.Rekognition.FaceDetail): Slack.AttachmentField[] => {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const fields: Slack.AttachmentField[] = [];
  if (detail.Confidence) {
    fields.push({
      title: 'Confidence',
      value: `${formatter.format(detail.Confidence)} %`,
      short: true,
    });
  }
  if (detail.Gender) {
    fields.push({
      title: detail.Gender.Value!,
      value: `${formatter.format(detail.Gender.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.AgeRange) {
    fields.push({
      title: 'AgeRange',
      value: `${detail.AgeRange.Low} - ${detail.AgeRange.High}`,
      short: true,
    });
  }
  if (detail.Smile) {
    fields.push({
      title: detail.Smile.Value ? 'Smile' : 'Not Smile',
      value: `${formatter.format(detail.Smile.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.Emotions) {
    detail.Emotions.forEach((emotion) => {
      fields.push({
        title: emotion.Type!,
        value: `${formatter.format(emotion.Confidence!)} %`,
        short: true,
      });
    });
  }
  if (detail.Eyeglasses) {
    fields.push({
      title: detail.Eyeglasses.Value ? 'Eyeglasses' : 'Not Eyeglasses',
      value: `${formatter.format(detail.Eyeglasses.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.Sunglasses) {
    fields.push({
      title: detail.Sunglasses.Value ? 'Sunglasses' : 'Not Sunglasses',
      value: `${formatter.format(detail.Sunglasses.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.EyesOpen) {
    fields.push({
      title: detail.EyesOpen.Value ? 'EyesOpen' : 'Not EyesOpen',
      value: `${formatter.format(detail.EyesOpen.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.MouthOpen) {
    fields.push({
      title: detail.MouthOpen.Value ? 'MouthOpen' : 'Not MouthOpen',
      value: `${formatter.format(detail.MouthOpen.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.Mustache) {
    fields.push({
      title: detail.Mustache.Value ? 'Mustache' : 'Not Mustache',
      value: `${formatter.format(detail.Mustache.Confidence!)} %`,
      short: true,
    });
  }
  if (detail.Beard) {
    fields.push({
      title: detail.Beard.Value ? 'Beard' : 'Not Beard',
      value: `${formatter.format(detail.Beard.Confidence!)} %`,
      short: true,
    });
  }
  return fields;
};

const processFile = async (channel: string, ts: string, file: Slack.File) => {
  console.log(file);
  const image = await Jimp.read({
    url: file.url_private,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  } as any);
  const scale = promisify(image.scale.bind(image));
  let buffer = await image.getBufferAsync(file.mimetype);
  let length = buffer.length;

  // ファイルサイズの縮小
  while (length > MAX_IMAGE_SIZE) {
    await scale(Math.sqrt(MAX_IMAGE_SIZE / length));
    buffer = await image.getBufferAsync(file.mimetype);
    length = buffer.length;
  }

  const width = image.getWidth();
  const height = image.getHeight();
  const data: AWS.Rekognition.DetectFacesResponse = await detectFaces({
    Image: {
      Bytes: buffer,
    },
    Attributes: ['ALL'],
  });
  if (data.FaceDetails) {
    await Promise.all(data.FaceDetails.map(async (detail, i) => {
      console.log(detail);
      const box = detail.BoundingBox!;
      const img = image.clone();
      const crop = promisify(img.crop.bind(img));
      const scaleToFit = promisify(img.scaleToFit.bind(img));
      await crop(
        box.Left! * width,
        box.Top! * height,
        box.Width! * width,
        box.Height! * height,
      );
      await scaleToFit(72, 72);
      const buf = await img.getBufferAsync(file.mimetype);
      const key = `${file.id}-${i}.${file.filetype}`;
      await putObject({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buf,
        ACL: 'public-read',
      });
      const url = getS3Url(REGION!, BUCKET_NAME!, key);
      const fields = detailToFields(detail);
      const body = {
        channel,
        text: `Face #${i} in ${file.title}`,
        thread_ts: ts,
        attachments: [
          {
            fields,
            thumb_url: url,
          },
        ],
      };
      await postMessage(body);
    }));
  }
};

interface HandleFileData {
  channel: string;
  ts: string;
  file: Slack.File;
}

export const handleFile: Handler<HandleFileData> = async (ev) => {
  const { channel, ts, file } = ev;
  await processFile(channel, ts, file);
};

export const slack: APIGatewayProxyHandler = async (ev) => {
  if (ev.body) {
    const req = JSON.parse(ev.body) as Slack.Request;
    console.log(req);

    if (typeof req !== 'object' || req.token !== VERIFICATION_TOKEN) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
        }),
      };
    }

    // url verification
    if (req.type === 'url_verification') {
      const { challenge } = req;
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge }),
      };
    }

    // Events API
    if (req.type === 'event_callback') {
      const { event } = req;
      if (event.attachments) {
        console.log(inspect(event.attachments));
      }
      switch (event.type) {
        case 'message': {
          if (event.subtype === 'file_share') {
            const { channel, ts } = event;
            await Promise.all(event.files.map(async (file) => {
              const payload: HandleFileData = {
                channel,
                ts,
                file,
              };
              const params = {
                FunctionName: HANDLE_FILE!,
                InvocationType: 'Event',
                Payload: JSON.stringify(payload),
              };
              await invoke(params);
            }));
          }
          return {
            statusCode: 200,
            body: JSON.stringify({
              ok: true,
            }),
          };
        }
      }
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      ok: false,
    }),
  };
};
