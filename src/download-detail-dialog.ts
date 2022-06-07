import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { Download, remainingDurationInSecond } from './download';


@customElement('download-detail-dialog')
export class DownloadDetailDialog extends LitElement {

  static override styles = css`
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
  `

  @property()
  public currentDownload?: Download = undefined

  override render() {
    if (!this.currentDownload) {
      return html``
    }

    let downloadData = html``
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

  buildRemainingTime(download: Download) {
    const remaingTimeInSecond = remainingDurationInSecond(download);

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

  formatSize(byte: number) {
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

declare global {
  interface HTMLElementTagNameMap {
    'download-detail-dialog': DownloadDetailDialog;
  }
}
