import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

const fetchDownloads = (hass) =>
  hass.callApi("GET", "aria_download_list");

class Aria2Card extends LitElement {
  fetching = false;
  downloadUrl = '';

  static get styles() {
    return css`
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
      }
    `
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      downloads: [],
    };
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const state = this.hass.states[this.config.entity]
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
            <ha-icon-button icon="hass:play" @click="${this.startDownload}">
            </ha-icon-button>
          </div>
          <div class="download-list">
            ${(this.downloads || []).slice(0, 10).map(download => html`
              <div class="item">
                <span class="name">${download.name}</span>
                ${this.buildDownloadIcon(download)}
              </div>
            `)}
          </div>
        </div>
      </ha-card>
    `;
  }

  buildDownloadIcon(download) {
    if (download.status === 'complete') {
      return html`<ha-icon-button icon="mdi:check" disabled="disabled"></ha-icon-button>`;
    } else if (download.status === 'paused') {
      return html`
      <ha-icon-button icon="mdi:play" @click="${() => this.actionOnDownload('resume', download)}"></ha-icon-button>
      <ha-icon-button icon="mdi:stop" @click="${() => this.actionOnDownload('remove', download)}"></ha-icon-button>
      `;
    } else {
      return html`
        <ha-icon-button icon="mdi:pause" @click="${() => this.actionOnDownload('pause', download)}"></ha-icon-button>
        <ha-icon-button icon="mdi:stop" @click="${() => this.actionOnDownload('remove', download)}"></ha-icon-button>
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
    console.log(downloads);
    this.downloads = downloads;
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