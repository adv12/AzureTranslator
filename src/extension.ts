import * as vscode from "vscode";
import { sourceLanguageChoices, targetLanguageChoices } from "./languageChoices";
import { Translator } from "./translator";

let translator = new Translator();

function getConfig(name: string) {
	return vscode.workspace.getConfiguration("azureTranslate").get(name);
}

async function setConfig(name: string, val: any) {
	await vscode.workspace.getConfiguration("azureTranslate").update(name, val, vscode.ConfigurationTarget.Global);
}

async function translate() {
	let editor = vscode.window.activeTextEditor;
	if (editor === undefined) {
		vscode.window.showWarningMessage("No active editor!");
		return;
	}
	if (translator.subscriptionKey === "") {
		await vscode.commands.executeCommand("azuretranslate.setSubscriptionKey");
	}
	if (translator.subscriptionKey === "") {
		vscode.window.showErrorMessage("Invalid Azure Subscription Key");
		return;
	}
	if (getConfig("sourceLanguage") === null) {
		await vscode.commands.executeCommand("azuretranslate.selectSourceLanguage");
	}
	let sourceLanguage = getConfig("sourceLanguage");
	if (sourceLanguage === null) {
		vscode.window.showErrorMessage("Invalid Source Language");
		return;
	}
	let targetLanguage = await vscode.window.showQuickPick(targetLanguageChoices, {
		placeHolder: "Select a Target Language"
	});
	if (getConfig("html") === null) {
		await vscode.commands.executeCommand("azuretranslate.enableDisableHtml");
	}

	let from = sourceLanguage as string;
	let to = targetLanguage as string;
	if (from === "Detect") {
		from = "";
	}
	else {
		from = from.split(":")[1].trim();
	}
	to = to.split(":")[1].trim();

	let inputs: string[] = [];
	let results: string[] = [];
	let selections = editor.selections;
	for (let i = 0; i < selections.length; i++) {
		let inputText = editor?.document.getText(selections[i]) ?? "";
		inputs.push(inputText);
		let result: string;
		if (inputText.length === 0) {
			result = inputText;
		}
		else {
			result = await translator.translate(
				getConfig("endpoint") as string,
				from,
				to,
				inputText ?? "",
				getConfig("html") as boolean);
		}
		results.push(result);
	}
	let anyTranslated: boolean = false;
	let success = await editor?.edit(builder => {
		for (let i = 0; i < selections.length; i++) {
			if (inputs[i] !== results[i]) {
				anyTranslated = true;
				builder.replace(selections[i], results[i]);
			}
		}
	});
	if (!anyTranslated) {
		vscode.window.showInformationMessage("Nothing translated!");
	}
}

async function setSubscriptionKey() {
	translator.subscriptionKey = (await vscode.window.showInputBox({
		placeHolder: "Enter a valid key",
		prompt: "Azure Subscription Key",
		value: translator.subscriptionKey
	})) ?? translator.subscriptionKey;
}

async function setEndpoint() {
	let endpoint = await vscode.window.showInputBox({
		prompt: "Azure Translator Endpoint"
	});
	if (endpoint !== undefined && endpoint !== null) {
		await setConfig("endpoint", endpoint);
	}
}

async function enableDisableHtml() {
	let html;
	let tmp = await vscode.window.showQuickPick(["Enabled", "Disabled"], {
		placeHolder: "Treat input as HTML"
	});
	if (tmp === "Enabled") {
		html = true;
	}
	else if (tmp === "Disabled") {
		html = false;
	}
	if (html !== null && html !== undefined) {
		await setConfig("html", html);
	}
}

async function selectSourceLanguage() {
	let sourceLanguage = await vscode.window.showQuickPick(sourceLanguageChoices, {
		placeHolder: "Select a Source Language"
	});
	if (sourceLanguage !== undefined && sourceLanguage !== null) {
		await setConfig("sourceLanguage", sourceLanguage);
	}
}

async function editSettings() {
	await vscode.commands.executeCommand("workbench.action.openSettings", "azureTranslate");
}

export function activate(context: vscode.ExtensionContext) {
	console.log("AzureTranslate is now active!");

	let disposable = vscode.commands.registerCommand("azuretranslate.translate", translate);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("azuretranslate.setSubscriptionKey", setSubscriptionKey);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("azuretranslate.setEndpoint", setEndpoint);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("azuretranslate.enableDisableHtml", enableDisableHtml);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("azuretranslate.selectSourceLanguage", selectSourceLanguage);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("azuretranslate.editSettings", editSettings);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
