import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";


const fetchDownloads = (hass) =>
  hass.callApi("GET", "aria_download_list");

class DownloadDialog extends LitElement {
  static get properties() {
    return {
      currentDownload: undefined
    };
  }

  render() {
    if (!this.currentDownload) {
      return html``;
    }

    let downloadData = html``;
    if (this.currentDownload.status !== 'complete' && this.currentDownload.status !== 'paused') {
      downloadData = html`
        <span class="label"> download speed: </span> <span class="value"> ${this.formatSize(this.currentDownload.download_speed)}/s </span> <br/>
        <span class="label"> remaining time: </span> <span class="value"> ${this.buildRemainingTime(this.currentDownload)} </span> <br/>
      `;
    }

    return html`
      <ha-dialog open hideactions heading=${this.currentDownload.name} @closed=${this.closeDetail}>
        <div>
          <span class="label">file: </span> <span class="value">${this.currentDownload.name}</span> <br/>
          <span class="label">status: </span> <span class="value">${this.currentDownload.status}</span><br/>
          <span class="label">size: </span> <span class="value"> ${this.formatSize(this.currentDownload.total_length)} </span> <br/>
          ${downloadData}
        </div>

        <ha-header-bar slot="heading">
          <ha-icon-button slot="navigationIcon" dialogAction="cancel">
            <ha-icon icon="mdi:close"></ha-icon>
          </ha-icon-button>
          <div slot="title" class="main-title">
            ${this.currentDownload.name}
          </div>
        </ha-header-bar>
      </ha-dialog>
      `;
  }

  static get styles() {
    return [
      css`
      .label {
        color: var(--secondary-text-color);
      }
      .value {
        color: var(--primary-text-color);
      }

      ha-header-bar {
        --mdc-theme-on-primary: var(--primary-text-color);
        --mdc-theme-primary: var(--mdc-theme-surface);
        flex-shrink: 0;
        display: block;
        border-bottom: 1px solid var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
      }

      @media (max-width: 450px), (max-height: 500px) {
        ha-dialog {
            --mdc-dialog-min-width: calc( 100vw - env(safe-area-inset-right) - env(safe-area-inset-left) );
            --mdc-dialog-max-width: calc( 100vw - env(safe-area-inset-right) - env(safe-area-inset-left) );
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertial-align-dialog: flex-end;
            --ha-dialog-border-radius: 0px;
        }

        ha-header-bar {
          --mdc-theme-primary: var(--app-header-background-color);
          --mdc-theme-on-primary: var(--app-header-text-color, white);
        }
      }
    `];
  }

  buildRemainingTime(download) {
    const remainingSize = download.total_length - download.completed_length;
    const currentSpeed = download.download_speed;

    const remaingTimeInSecond = (remainingSize / currentSpeed);

    const hours = Math.floor(remaingTimeInSecond / 3600);
    const minutes = Math.floor((remaingTimeInSecond - (hours * 3600)) / 60);
    const seconds = Math.floor(remaingTimeInSecond - (minutes * 60));

    let result = '';
    if (hours > 0) {
      result += hours + 'h '
    }
    if (minutes > 0) {
      result += minutes + 'm '
    }
    if (hours == 0) {
      result += seconds + 's'
    }

    return result;
  }

  formatSize(byte) {
    const gigaBytes = byte / 1_073_741_824;
    if (gigaBytes >= 1) {
      return (Math.round(gigaBytes * 100) / 100) + 'Go';
    }
    const megaBytes = byte / 1_048_576;
    if (megaBytes >= 1) {
      return (Math.round(megaBytes * 100) / 100) + 'Mo';
    }

    return byte + ' o';
  }

  closeDetail() {
    this.currentDownload = undefined;
  }
}
customElements.define('downloading-dialog', DownloadDialog);

class Aria2Card extends LitElement {
  fetching = false;
  downloadUrl = '';

  static get styles() {
    return [
      css`
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
    `];
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      downloads: [],
      currentDownload: undefined
    };
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
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

  openDetail(download) {
    const hassShadowRoot = document.getElementsByTagName('home-assistant')[0].shadowRoot

    const existingDownloadingDialog = hassShadowRoot.querySelector('downloading-dialog')

    if (existingDownloadingDialog) {
      existingDownloadingDialog.currentDownload = download
    } else {
      const newDialog = document.createElement('downloading-dialog')
      newDialog.currentDownload = download
      hassShadowRoot.appendChild(newDialog)
    }
  }

  buildDownloadIcon(download) {
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

  connectedCallback() {
    super.connectedCallback();

    if (this.hass) {
      if (!this.fetching) {
        this.fetching = true;

        setTimeout(() => this._refresh(), 0);
        setInterval(() => this._refresh(), 30000);
      }
    }
  }

  setConfig(config) {
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  async _refresh() {
    const downloads = await fetchDownloads(this.hass)
    this.downloads = downloads;
    if (this.currentDownload) {
      const refreshedDownload = downloads.filter(download => download.gid == this.currentDownload.gid);
      if (refreshedDownload.length > 0) {
        this.currentDownload = refreshedDownload[0];
      }
    }
  }

  get _downloadItem() {
    return this.shadowRoot.querySelector(".addBox");
  }

  async startDownloadOnEnter(ev) {
    if (ev.keyCode === 13) {
      this.startDownload();
    }
  }

  async startDownload() {
    if (this._downloadItem.value && this._downloadItem.value.length > 0) {
      await this.hass.callService('aria2', 'start_download', {'url': this._downloadItem.value})
      this._downloadItem.value = ''
      setTimeout(() => this._refresh(), 300);
    }
  }

  async actionOnDownload(action, download) {
    await this.hass.callService('aria2', action + '_download', {'gid': download.gid})
    setTimeout(() => this._refresh(), 300);
  }
}

customElements.define('aria2-card', Aria2Card);