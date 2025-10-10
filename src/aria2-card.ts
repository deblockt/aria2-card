import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';
import { Download, downloadedPercent } from './download';
import { DownloadDetailDialog } from './download-detail-dialog';
import { localize } from './localize/localize';

@customElement('aria2-card')
export class Aria2Card extends LitElement {
  static override styles = css`
    .start-download-row {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .start-download-row > .addBox {
      flex-grow: 1;
    }

    .download-list .item {
      width: 100%;
      position: relative;
    }

    .download-list .info {
      display: flex;
      flex-direction: row;
      align-items: center;
      position: relative
    }

    .progress {
      height: 100%;
      position: absolute;
      top: 0;
      background-color: var(--mdc-select-fill-color);
      transition: width 3000ms linear;
    }

    .download-list .item .name {
      flex-grow: 1;
      overflow: hidden;
      cursor: pointer;
      padding-left: 5px;
    }
  `;

  @property()
  hass?: any = undefined;

  @property()
  config?: any = undefined;

  @state()
  downloads: Download[] = [];

  override render() {
    if (!this.config || !this.hass) {
      return html``
    }
    if (!('entry_id' in this.config)) {
      return html`<ha-card> <div class="card-content"> You should edit the card to select the aria server to use. </div> </ha-card>`
    }

    return html`
      <ha-card>
        <div class="card-content">
          <div class="start-download-row">
            <ha-textfield icon class="addBox" iconTrailing="true" placeholder="${localize('card.url_to_download')}" @keydown=${this.startDownloadOnEnter}>
              <div class="trailing" slot="trailingIcon">
                <ha-icon-button @click="${this.startDownload}">
                  <ha-icon style="display: flex" icon="hass:play"></ha-icon>
                </ha-icon-button>
              </div>
            </ha-textfield> 
          </div>
          <div class="download-list">
            ${
              repeat(
                (this.downloads || []).slice(0, 10),
                (downwload: Download) => downwload.gid,
                (download: Download) => html`
              <div class="item">
                ${this.buildProgressBar(download)}
                <div class="info">
                  <span @click="${() => this.openDetail(download)}" class="name">${download.name}</span>
                  ${this.buildDownloadIcon(download)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </ha-card>
    `;
  }

  openDetail(download: Download) {
    const hassShadowRoot = document.getElementsByTagName('home-assistant')[0].shadowRoot

    const existingDownloadingDialog: DownloadDetailDialog | null | undefined = hassShadowRoot?.querySelector('download-detail-dialog')

    if (existingDownloadingDialog) {
      existingDownloadingDialog.currentDownload = download
    } else {
      const newDialog: any = document.createElement('download-detail-dialog')
      newDialog.currentDownload = download
      hassShadowRoot?.appendChild(newDialog)
    }
  }

  buildDownloadIcon(download: Download) {
    if (download.status === 'complete' || download.status === 'removed') {
      return html`<ha-icon-button disabled="disabled"><ha-icon style="display: flex" icon="hass:check"></ha-icon></ha-icon-button>`;
    } else if (download.status === 'paused') {
      return html`
      <ha-icon-button @click="${() => this.actionOnDownload('resume', download)}"><ha-icon style="display: flex" icon="hass:play"></ha-icon></ha-icon-button>
      <ha-icon-button @click="${() => this.actionOnDownload('remove', download)}"><ha-icon style="display: flex" icon="hass:stop" ></ha-icon></ha-icon-button>
      `;
    } else {
      return html`
      <ha-icon-button @click="${() => this.actionOnDownload('pause', download)}"><ha-icon style="display: flex" icon="hass:pause"></ha-icon></ha-icon-button>
      <ha-icon-button @click="${() => this.actionOnDownload('remove', download)}"><ha-icon style="display: flex" icon="hass:stop" ></ha-icon></ha-icon-button>
      `;
    }
  }

  buildProgressBar(download: Download) {
    if (download.status != 'complete' && download.status !== 'removed') {
      return html`
        <div class="progress" style="width: ${downloadedPercent(download)}%">
        </div>
      `;
    } else {
      return html``;
    }
  }

  get _downloadItem(): any | undefined {
    return this.shadowRoot?.querySelector(".addBox");
  }

  async startDownloadOnEnter(ev: any) {
    if (ev.keyCode === 13) {
      this.startDownload()
    }
  }

  async startDownload() {
    if (this._downloadItem && this._downloadItem.value && this._downloadItem.value.length > 0) {
      await this.hass.callService('aria2', 'start_download', {'url': this._downloadItem.value, 'server_entry_id': this.entryId})
      this._downloadItem.value = ''
    }
  }

  async actionOnDownload(action: 'pause' | 'remove' | 'resume', download: Download) {
    await this.hass.callService('aria2', action + '_download', {'gid': download.gid, 'server_entry_id': this.entryId})
  }

  async _refresh(aria_state: {server_entry_id?: string, list: Download[]}) {
    if (aria_state.server_entry_id && this.entryId !== aria_state.server_entry_id) {
      return;
    }

    this.downloads = aria_state.list

    const hassShadowRoot = document.getElementsByTagName('home-assistant')[0].shadowRoot
    const existingDownloadingDialog: DownloadDetailDialog | null | undefined = hassShadowRoot?.querySelector('download-detail-dialog')

    if (existingDownloadingDialog?.currentDownload) {
      const refreshedDownload = this.downloads.filter(download => download.gid == existingDownloadingDialog?.currentDownload?.gid);
      if (refreshedDownload.length > 0) {
        existingDownloadingDialog.currentDownload = refreshedDownload[0];
      }
    }
  }

  get entryId() {
    return this.config['entry_id'];
  }

  setConfig(config: any) {
    this.config = config;
    if (!this.entryId) {
      return;
    }
    if (this.hass) {
      this.downloads = [];
      this.hass!.callService('aria2', 'refresh_downloads', {'server_entry_id': this.entryId});
    }
  }

  override firstUpdated() {
    this.hass!.connection.subscribeEvents((e: any) => this._refresh(e.data), 'download_list_updated');
    if (!this.entryId) {
      return;
    }
    this.hass!.callService('aria2', 'refresh_downloads', {'server_entry_id': this.entryId});
  }

  getCardSize() {
    return 1 + Math.min(10, this.downloads.length);
  }

  static getConfigElement() {
    return document.createElement('aria2-card-editor');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aria2-card': Aria2Card;
  }

  interface Window {
    customCards: {type: string; name: string; preview: boolean; description: string}[];
   }
}
