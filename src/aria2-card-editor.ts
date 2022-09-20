
import {LitElement, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

@customElement('aria2-card-editor')
export class Aria2CardEditor extends LitElement {
  @property()
  hass?: any = undefined;

  @property()
  config?: any = undefined;

  @state()
  private entries: any[] = [];

  @state()
  private loadingEntries = true;

  setConfig(config: any) {
    this.config = config;
  }

  private setServer(serverEvent: any) {
    this.setConfigProperty('entry_id', serverEvent.target.value);
    const event: any = new Event("config-changed", {
      bubbles: true,
      composed: true
    });
    event.detail = {config: this.config};
    this.dispatchEvent(event);
  }

  private setConfigProperty(key: string, value: any) {
    this.config = {
      ...this.config,
      [key]: value,
    };
  }

  stopPropagation(ev: any) {
    ev.stopPropagation();
  }

  override render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="card-config">
        ${this.renderServers()}
      </div>
    `;
  }

  renderServers() {
    if (this.loadingEntries) {
      return html`<span>loading available aria servers</span>`;
    }
    if (this.entries.length === 0) {
      return html`<span>No aria2 integration found. Follow this <a target="_blank" href="https://github.com/deblockt/hass-aria2#installation">documentation</a> </span>`;
    }
    const value = this.config['entry_id'] || this.entries[0].entry_id;

    return html`
      <ha-select
          label="server"
          @selected=${this.setServer}
          @closed=${this.stopPropagation}
          .value=${value}
          fixedMenuPosition
          naturalMenuWidth
        >
            ${this.entries.map((entry) => {
              return html` <mwc-list-item .value=${entry.entry_id}>${entry.title}</mwc-list-item>`;
            })}
        </ha-select>
    `;
  }

  override async firstUpdated() {
    this.loadingEntries = true;
    this.entries = (await this.hass!.callWS({type: 'config_entries/get', domain: 'aria2'}))
      .filter((e: any) => e.state === 'loaded')
    this.loadingEntries = false;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "aria2-card",
  name: "Aria2 Card",
  preview: false,
  description: "A card to manage aria2 download server"
});

declare global {
  interface Window {
    customCards: {type: string; name: string; preview: boolean; description: string}[];
  }
}
