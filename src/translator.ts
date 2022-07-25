/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import axios, { Axios, AxiosError } from "axios";

interface Alignment {
	proj: string;
}

interface DetectedLanguage {
	language: string;
	score: number;
}

interface Error {
	code: number;
	message: string;
}

interface ErrorWrapper {
	error: Error;
}

interface SentenceLength {
	srcSentLen: number[];
	transSentLen: number[];
}

interface TextResult {
	text: string;
	script: string;
}

interface Translation {
	text: string;
	transliteration: TextResult;
	to: string;
	alignment: Alignment;
	sentLen: SentenceLength;
}

interface TranslationResult {
	detectedLanguage: DetectedLanguage;
	sourceText: TextResult;
	translations: Translation[];
}

export class Translator {

	subscriptionKey: string = "";

	async translate(endpoint: string, from: string, to: string, inputText: string, html: boolean) {
		let textType = html ? "html" : "plain";
		let fromParam = `&from=${from}`;
		if (from.match(/^\s*$/)) {
			fromParam = "";
		}
		let route = `/translate?api-version=3.0${fromParam}&to=${to}&textType=${textType}`;

		let body = JSON.stringify([{ "Text": inputText }]);
		try {
			let response = await axios.post<TranslationResult[]>(
				`${endpoint}${route}`,
				body,
				{
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						"Ocp-Apim-Subscription-Key": this.subscriptionKey
					},
				},
			);

			let results = response.data;

			for (const r of results) {
				for (const t of r.translations) {
					return t.text;
				}
			}
		}
		catch (error) {
			try {
				let axiosError = error as AxiosError;
				let errorWrapper = axiosError.response?.data as ErrorWrapper;
				vscode.window.showErrorMessage(`${axiosError.message}: ${errorWrapper.error.message}`);
			}
			catch (error2) {
				vscode.window.showErrorMessage("Unknown error in translation");
			}
		}

		return inputText;
	}
}