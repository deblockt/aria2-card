import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import { Download } from './download';
import { DownloadDetailDialog } from './download-detail-dialog';


@customElement('aria2-card')
export class Aria2Card extends LitElement {
  static override styles = css`
    .start-download-row {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .start-download-row > paper-input {
      flex-grow: 1;
    }

    .download-list .item {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .download-list .item .name {
      flex-grow: 1;
      overflow: hidden;
      cursor: pointer;
    }
  `;

  @property()
  hass?: any = undefined;

  @property()
  config?: any = undefined;

  @state()
  downloads: Download[] = [];

  fetching = false;

  override render() {
    if (!this.config || !this.hass) {
      return html``
    }

    return html`
      <ha-card>
        <div class="card-content">
          <div class="start-download-row">
            <paper-input
              no-label-float
              class="addBox"
              placeholder="url of the file to download"
              @keydown=${this.startDownloadOnEnter}
            ></paper-input>
            <ha-icon-button @click="${this.startDownload}">
              <ha-icon icon="hass:play"></ha-icon>
            </ha-icon-button>
          </div>
          <div class="download-list">
            ${(this.downloads || []).slice(0, 10).map(download => html`
              <div class="item">
                <span @click="${() => this.openDetail(download)}" class="name">${download.name}</span>
                ${this.buildDownloadIcon(download)}
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
    if (download.status === 'complete') {
      return html`<ha-icon-button disabled="disabled"><ha-icon icon="hass:check"></ha-icon></ha-icon-button>`;
    } else if (download.status === 'paused') {
      return html`
      <ha-icon-button @click="${() => this.actionOnDownload('resume', download)}"><ha-icon icon="hass:play"></ha-icon></ha-icon-button>
      <ha-icon-button @click="${() => this.actionOnDownload('remove', download)}"><ha-icon icon="hass:stop" ></ha-icon></ha-icon-button>
      `;
    } else {
      return html`
      <ha-icon-button @click="${() => this.actionOnDownload('pause', download)}"><ha-icon icon="hass:pause"></ha-icon></ha-icon-button>
      <ha-icon-button @click="${() => this.actionOnDownload('remove', download)}"><ha-icon icon="hass:stop" ></ha-icon></ha-icon-button>
      `;
    }
  }

  // TODO find type to return
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
      await this.hass.callService('aria2', 'start_download', {'url': this._downloadItem.value})
      this._downloadItem.value = ''
      setTimeout(() => this._refresh(), 300)
    }
  }

  async actionOnDownload(action: 'pause' | 'remove' | 'resume', download: Download) {
    await this.hass.callService('aria2', action + '_download', {'gid': download.gid})
    setTimeout(() => this._refresh(), 300)
  }

  async _refresh() {
    const downloads = await this.hass.callApi("GET", "aria_download_list")

    const hassShadowRoot = document.getElementsByTagName('home-assistant')[0].shadowRoot
    const existingDownloadingDialog: DownloadDetailDialog | null | undefined = hassShadowRoot?.querySelector('download-detail-dialog')

    this.downloads = downloads;
    if (existingDownloadingDialog?.currentDownload) {
      const refreshedDownload = this.downloads.filter(download => download.gid == existingDownloadingDialog?.currentDownload?.gid);
      if (refreshedDownload.length > 0) {
        existingDownloadingDialog.currentDownload = refreshedDownload[0];
      }
    }
  }

  setConfig(config: any) {
    this.config = config
  }

  override connectedCallback() {
    super.connectedCallback();

    if (this.hass) {
      if (!this.fetching) {
        this.fetching = true;

        setTimeout(() => this._refresh(), 0);
        setInterval(() => this._refresh(), 30000);
      }
    }
  }

  getCardSize() {
    return 1+ Math.min(10, this.downloads.length);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aria2-card': Aria2Card;
  }
}
