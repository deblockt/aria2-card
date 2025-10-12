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
    
    .file-entry {
      display: flex;
      justify-content: space-between;
      white-space: nowrap;
      overflow: hidden;
      gap: 1rem;
    }

    .file-path {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-progress {
      flex-shrink: 0;
      color: var(--secondary-text-color);
    }
  `;

  @property()
  public currentDownload?: Download = undefined;

  override render() {
    if (!this.currentDownload) {
      return html``;
    }

    let downloadData = html``;
    if (this.currentDownload.status === 'active') {
      if (!this.currentDownload.is_torrent || !this.currentDownload.seeder) {
        downloadData = html`
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.download_speed')}:</span>
            <span class="value">${this.formatSize(this.currentDownload.download_speed)}/s</span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.progress')}:</span>
            <span class="value">
              ${this.buildProgress(
                this.currentDownload,
                this.currentDownload.completed_length
              )}
            </span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.remaining_time')}:</span>
            <span class="value">
              ${this.buildRemainingTime(
                this.currentDownload,
                this.currentDownload.completed_length,
                this.currentDownload.download_speed
              )}
            </span>
          </div>
        `;
      } else {
        downloadData = html`
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.upload_speed')}: </span>
            <span class="value">${this.formatSize(this.currentDownload.upload_speed)}/s</span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.upload_progress')}: </span>
            <span class="value">
              ${this.buildProgress(
                this.currentDownload,
                this.currentDownload.upload_length
              )}
            </span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.remaining_time')}: </span>
            <span class="value">
              ${this.buildRemainingTime(
                this.currentDownload,
                this.currentDownload.upload_length,
                this.currentDownload.upload_speed
              )}
            </span>
          </div>
        `;
      }
    }

    return html`
      <ha-dialog
        open
        hideactions
        heading=${this.currentDownload.name}
        @closed=${this.closeDetail}
      >
        <div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.file')}: </span>
            <span class="value">${this.currentDownload.name}</span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.status')}:</span>
            <span class="value">${this.mapStatus(this.currentDownload)}</span>
          </div>
          <div class="info-row">
            <span class="label">${localize('download_detail_popin.size')}: </span>
            <span class="value">${this.formatSize(this.currentDownload.total_length)}</span>
          </div>
          ${downloadData} ${this.listFile(this.currentDownload)}
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

  listFile(download: Download) {
    if (!download.is_torrent) {
      return html``;
    }
    const files = [...download.files].sort((a, b) =>
      a.path.localeCompare(b.path)
    );
    const commonPathPrefix = files.length === 1
      ? [] 
      : files
        .map((f) => f.path.split('/'))
        .reduce((prefix, parts) => {
          let i = 0;
          while (
            i < prefix.length &&
            i < parts.length &&
            prefix[i] === parts[i]
          ) {
            i++;
          }
          return prefix.slice(0, i);
        });

    const prefixPath = commonPathPrefix.join('/');
    const prefixLength = prefixPath.length > 0 ? prefixPath.length + 1 : 0;

    return html`
      <div>
        <span class="label">${localize('download_detail_popin.files')}:</span>
        ${files.map((file) => {
          const relativePath = file.path.substring(prefixLength);
          const percent =
            file.length === file.completed_length
              ? '100'
              : file.length > 0
              ? ((file.completed_length / file.length) * 100).toFixed(2)
              : '0.00';
          const sizeIndication =
            file.completed_length == file.length
              ? html`${this.formatSize(file.length)}`
              : html`${this.formatSize(file.completed_length)} /
                ${this.formatSize(file.length)}`;

          return html`
            <div class="file-entry" title="${relativePath}">
              <span class="file-path">${relativePath}</span>
              <span class="file-progress">
                ${sizeIndication} (${percent}%)
              </span>
            </div>
          `;
        })}
      </div>
    `;
  }

  mapStatus(download: Download): string {
    if (download.is_torrent && download.seeder) {
      return localize('download_detail_popin.status_name.seed');
    } else {
      return localize(
        ('download_detail_popin.status_name.' +
          download.status) as TranslationKey
      );
    }
  }

  buildProgress(download: Download, complete_length: number) {
    const downloadPercent = downloadedPercent(download, complete_length);
    return (
      downloadPercent.toFixed(2) +
      '% (' +
      this.formatSize(complete_length) +
      ' ' +
      localize('download_detail_popin.of') +
      ' ' +
      this.formatSize(download.total_length) +
      ')'
    );
  }

  buildRemainingTime(
    download: Download,
    completed_length: number,
    speed: number
  ) {
    const remaingTimeInSeconds = remainingDurationInSeconds(
      download,
      completed_length,
      speed
    );

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

    return (unit === 'GB' ? size.toFixed(2) : size.toFixed(0)) + ' ' + unit;
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
