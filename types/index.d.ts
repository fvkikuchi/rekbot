declare namespace Slack {
  export interface UrlVerificationRequest {
    type: 'url_verification';
    token: string;
    challenge: string;
  }

  export interface EventCallbackRequest {
    token: string;
    team_id: string;
    api_app_id: string;
    event: SlackEvent;
    type: 'event_callback';
    event_id: string;
    event_time: number;
    authed_users: string[];
  }

  export type Request = UrlVerificationRequest | EventCallbackRequest;

  export interface UserMessageEvent {
    type: 'message';
    user: string;
    text: string;
    client_msg_id: string;
    attachments?: object[];
    ts: string;
    channel: string;
    event_ts: string;
    channel_type: string;
    subtype: undefined;
  }

  export interface FileShareMessageEvent {
    type: 'message';
    text: string;
    files: File[];
    upload: boolean;
    user: string;
    display_as_bot: boolean;
    attachments?: object[];
    ts: string;
    channel: string;
    subtype: 'file_share';
    event_ts: string;
    channel_type: string;
  }

  export interface BotMessageEvent {
    text: string;
    username: string;
    bot_id: string;
    type: 'message';
    subtype: 'bot_message';
    attachments?: object[];
    ts: string;
    channel: string;
    event_ts: string;
    channel_type: string;
  }

  export type SlackEvent = UserMessageEvent | FileShareMessageEvent | BotMessageEvent;

  export interface ChatPostMessage {
    channel: string;
    text: string;
    as_user?: boolean;
    attachements?: { [key: string]: string }[];
    icon_emoji?: string;
    icon_url?: string;
    link_names?: boolean;
    mkrdwn?: boolean;
    parse?: string;
    reply_broadcast?: boolean;
    thread_ts?: string;
    unfurl_links?: boolean;
    unfurl_media?: boolean;
    username?: string;
  }

  export interface AttachmentField {
    title: string;
    value: string;
    short: boolean;
  }

  export interface File {
    id: string;
    created: number;
    timestamp: number;
    name: string;
    title: string;
    mimetype: string;
    filetype: string;
    pretty_type: string;
    user: string;
    editable: false;
    size: number;
    mode: string;
    is_external: boolean;
    external_type: string;
    is_public: boolean;
    public_url_shared: boolean;
    display_as_bot: boolean;
    username: string;
    url_private: string;
    url_private_download: string;
    thumb_64: string;
    thumb_80: string;
    thumb_160: string;
    thumb_360: string;
    thumb_360_w: number;
    thumb_360_h: number;
    thumb_480: string;
    thumb_480_w: number;
    thumb_480_h: number;
    thumb_720: string;
    thumb_720_w: number;
    thumb_720_h: number;
    thumb_800: string;
    thumb_800_w: number;
    thumb_800_h: number;
    thumb_960: string;
    thumb_960_w: number;
    thumb_960_h: number;
    thumb_1024: string;
    thumb_1024_w: number;
    thumb_1024_h: number;
    image_exif_rotation: number;
    original_w: number;
    original_h: number;
    permalink: string;
    permalink_public: string;
  }
}
