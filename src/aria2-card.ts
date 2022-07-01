import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import { Download, downloadedPercent } from './download';
import { DownloadDetailDialog } from './download-detail-dialog';

const FAST_REFRESH_DURATION_MILI = 3000;
const SLOW_REFRESH_DURATION_MILI = 30000;

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
      width: 100%;
      position: relative;
    }

    .download-list .info {
      display: flex;
      flex-direction: row;
      align-items: center;
      z-index: 1100;
      position: relative
    }

    .progress {
      height: 100%;
      position: absolute;
      z-index: 1000;
      top: 0;
      background-color: var(--mdc-select-fill-color);
      transition: width ${FAST_REFRESH_DURATION_MILI}ms linear;
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

  fetching = false;

  refreshInterval?: NodeJS.Timer = undefined;
  isFastRefresh = false;

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
              <ha-icon style="display: flex" icon="hass:play"></ha-icon>
            </ha-icon-button>
          </div>
          <div class="download-list">
            ${(this.downloads || []).slice(0, 10).map(download => html`
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

    const hasActiveDownload = downloads.filter((download: Download) => download.status === 'active').length > 0;
    if (this.refreshInterval) {
      if (hasActiveDownload && !this.isFastRefresh) {
        clearInterval(this.refreshInterval);
        this.isFastRefresh = true;
        this.refreshInterval = setInterval(() => this._refresh(), FAST_REFRESH_DURATION_MILI)
      } else if (!hasActiveDownload && this.isFastRefresh) {
        clearInterval(this.refreshInterval);
        this.isFastRefresh = false;
        this.refreshInterval = setInterval(() => this._refresh(), SLOW_REFRESH_DURATION_MILI)
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
        this.refreshInterval = setInterval(() => this._refresh(), SLOW_REFRESH_DURATION_MILI);
        this.isFastRefresh = false;
      }
    }
  }

  getCardSize() {
    return 1 + Math.min(10, this.downloads.length);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aria2-card': Aria2Card;
  }
}
