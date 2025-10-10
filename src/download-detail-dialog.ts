import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {
  Download,
  remainingDurationInSeconds,
  downloadedPercent,
} from './download';
import {localize, TranslationKey} from './localize/localize';

@customElement('download-detail-dialog')
export class DownloadDetailDialog extends LitElement {
  static override styles = css`
    ha-dialog {
      --mdc-dialog-min-width: auto;
      --mdc-dialog-min-height: auto;
      z-index: 2000;
    }

    @media (max-width: 450px), (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: 100vw;
        --mdc-dialog-max-width: 100vw;
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
      }
    }

    .label {
      color: var(--secondary-text-color);
    }
    .value {
      color: var(--primary-text-color);
    }
  `;

  @property()
  public currentDownload?: Download = undefined;

  override render() {
    if (!this.currentDownload) {
      return html``;
    }

    let downloadData = html``;
    if (
      this.currentDownload.status !== 'complete' &&
      this.currentDownload.status !== 'paused'
    ) {
      downloadData = html`
        <span class="label"
          >${localize('download_detail_popin.download_speed')}:
        </span>
        <span class="value">
          ${this.formatSize(this.currentDownload.download_speed)}/s
        </span>
        <br />
        <span class="label"
          >${localize('download_detail_popin.progress')}:
        </span>
        <span class="value"> ${this.buildProgress(this.currentDownload)} </span>
        <br />
        <span class="label"
          >${localize('download_detail_popin.remaining_time')}:
        </span>
        <span class="value">
          ${this.buildRemainingTime(this.currentDownload)}
        </span>
        <br />
      `;
    }

    return html`
      <ha-dialog
        open
        hideactions
        heading=${this.currentDownload.name}
        @closed=${this.closeDetail}
      >
        <div>
          <span class="label">${localize('download_detail_popin.file')}: </span>
          <span class="value">${this.currentDownload.name}</span> <br />
          <span class="label"
            >${localize('download_detail_popin.status')}:
          </span>
          <span class="value"
            >${localize(
              'download_detail_popin.status_name.' + this.currentDownload.status as TranslationKey
            )}</span
          ><br />
          <span class="label">${localize('download_detail_popin.size')}: </span>
          <span class="value">
            ${this.formatSize(this.currentDownload.total_length)}
          </span>
          <br />
          ${downloadData}
        </div>

        <ha-dialog-header slot="heading">
          <ha-icon-button slot="navigationIcon" dialogAction="cancel">
            <ha-icon style="display: flex" icon="mdi:close"></ha-icon>
          </ha-icon-button>
          <span slot="title">${this.currentDownload.name}</span>
        </ha-dialog-header>
      </ha-dialog>
    `;
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has('currentDownload') &&
      this.currentDownload != undefined
    ) {
      window.history.pushState({currentDownload: this.currentDownload.gid}, '');
    }
  }

  buildProgress(download: Download) {
    const downloadPercent = downloadedPercent(download);
    return (
      downloadPercent.toFixed(2) +
      '% (' +
      this.formatSize(download.completed_length) +
      ' ' +
      localize('download_detail_popin.of') +
      ' ' +
      this.formatSize(download.total_length) +
      ')'
    );
  }

  buildRemainingTime(download: Download) {
    const remaingTimeInSeconds = remainingDurationInSeconds(download);

    if (!isFinite(remaingTimeInSeconds)) {
      return localize('download_detail_popin.infinity');
    }

    const days = Math.floor(remaingTimeInSeconds / (3600 * 24));
    const hours = Math.floor((remaingTimeInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((remaingTimeInSeconds % 3600) / 60);
    const seconds = Math.floor(remaingTimeInSeconds % 60);

    let result = '';
    if (days > 0) {
      result += days + ` ${localize('download_detail_popin.time.day')} `;
    }
    if (hours > 0) {
      result += hours + ` ${localize('download_detail_popin.time.hour')} `;
    }
    if (minutes > 0) {
      result += minutes + ` ${localize('download_detail_popin.time.minute')} `;
    }
    if (hours === 0 && days === 0) {
      result += seconds + ` ${localize('download_detail_popin.time.second')} `;
    }

    return result;
  }

  formatSize(size: number) {
    const sizeUnits = ['B', 'KB', 'MB', 'GB'];
    let unit = sizeUnits[0];

    if (!size) {
      size = 0;
    }

    for (let i = 1; i < sizeUnits.length; i++) {
      if (size >= 1024) {
        size = size / 1024;
        unit = sizeUnits[i];
      } else {
        break;
      }
    }
    return size.toFixed(2) + ' ' + unit;
  }

  closeDetail() {
    if (
      this.currentDownload !== undefined &&
      window.history.state &&
      window.history.state.currentDownload === this.currentDownload?.gid
    ) {
      window.history.back();
    }
    this.currentDownload = undefined;
  }

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', () => this.closeDetail());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'download-detail-dialog': DownloadDetailDialog;
  }
}
