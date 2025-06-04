// hooks/useProviderDetection.ts
import { useMemo } from "react";

interface Provider {
	id: number;
	name: string;
	image: any;
	code: string;
}

export const useProviderDetection = (
	phoneNumber: string,
	selectedProvider: Provider | null,
) => {
	return useMemo(() => {
		if (phoneNumber.length !== 11 || !selectedProvider) return "";

		const getProviderFromPhone = (phone: string): string => {
			const prefix = phone.slice(0, 4);
			const mtn = [
				"0803",
				"0806",
				"0703",
				"0706",
				"0813",
				"0816",
				"0810",
				"0814",
				"0903",
				"0906",
				"0913",
				"0916",
			];
			const glo = ["0805", "0807", "0705", "0815", "0811", "0905", "0915"];
			const airtel = [
				"0802",
				"0808",
				"0708",
				"0812",
				"0701",
				"0902",
				"0907",
				"0901",
				"0912",
			];
			const nineMobile = ["0809", "0817", "0818", "0909", "0908"];

			if (mtn.includes(prefix)) return "MTN";
			if (glo.includes(prefix)) return "GLO";
			if (airtel.includes(prefix)) return "AIRTEL";
			if (nineMobile.includes(prefix)) return "9MOBILE";
			return "";
		};

		const detectedProvider = getProviderFromPhone(phoneNumber);
		return detectedProvider === selectedProvider.name ? detectedProvider : "";
	}, [phoneNumber, selectedProvider]);
};
