import { AzureExtensionApiProvider } from '@microsoft/vscode-azext-utils/api';
import * as vscode from 'vscode';
import { ApplicationResourceProviderManager } from '../../api/v2/providers/ApplicationResourceProviderManager';
import { localize } from '../../utils/localize';
import { AzureAccountExtensionApi } from './azure-account.api';
import { GenericItem } from './GenericItem';
import { ResourceGroupResourceBase } from './ResourceGroupResourceBase';
import { SubscriptionResource } from './SubscriptionResource';

export class ResourceGroupsTreeDataProvider extends vscode.Disposable implements vscode.TreeDataProvider<ResourceGroupResourceBase> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | ResourceGroupResourceBase | null | undefined>();

    private api: AzureAccountExtensionApi | undefined;
    private filtersSubscription: vscode.Disposable | undefined;

    constructor(private readonly resourceProviderManager: ApplicationResourceProviderManager) {
        super(
            () => {
                this.filtersSubscription?.dispose();
            });
    }

    onDidChangeTreeData: vscode.Event<void | ResourceGroupResourceBase | null | undefined> = this.onDidChangeTreeDataEmitter.event;

    getTreeItem(element: ResourceGroupResourceBase): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: ResourceGroupResourceBase | undefined): Promise<ResourceGroupResourceBase[] | null | undefined> {
        if (element) {
            return await element.getChildren();
        } else {
            const api = await this.getApi();

            if (api) {
                if (api.filters.length === 0) {
                    return [ new GenericItem(localize('noSubscriptions', 'Select Subscriptions...'), 'azure-account.selectSubscriptions') ]
                } else {
                    return api.filters.map(subscription => new SubscriptionResource(subscription, this.resourceProviderManager));
                }
            }
        }

        return undefined;
    }

    private async getApi(): Promise<AzureAccountExtensionApi | undefined> {
        if (!this.api) {
            const extension = vscode.extensions.getExtension<AzureExtensionApiProvider>('ms-vscode.azure-account');

            if (extension) {
                if (!extension.isActive) {
                    await extension.activate();
                }

                this.api = extension.exports.getApi<AzureAccountExtensionApi>('1');

                if (this.api) {
                    await this.api.waitForFilters();

                    this.filtersSubscription = this.api.onFiltersChanged(() => this.onDidChangeTreeDataEmitter?.fire());
                }
            }
        }

        return this.api;
    }
}
