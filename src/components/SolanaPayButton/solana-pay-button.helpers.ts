import { ISerializedTxRes } from "./solana-pay-button.interface";
import axios from 'axios';

export const getSerializedTx = async (payload: {reference: string, amount: number, account: string}) =>{
    const url = `http://localhost:9008/solana-pay?amount=${payload.amount}&reference=${payload.reference}`;

    try {
      const response = await axios.post(url, {
        account: payload.account
    });

      console.log({response})

      if (response.status === 200) {
        const data: ISerializedTxRes = await response.data;
        console.log('Success:', data);
        alert('Transaction successful!');
        return data?.transaction;
      } else {
        console.error('Error:', response.statusText);
        alert('Transaction failed.');
        return '';
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to execute transaction.');
      return '';
    }
}

export const extractDataFromSolanaTxRequest = (uri: string) =>{
    const decodedUrl = decodeURIComponent(uri);
    const urlWithoutPrefix = decodedUrl.replace('solana:', '');

    const url = new URL(urlWithoutPrefix);
    const searchParams = new URLSearchParams(url.search);

    console.log({searchParams})
    const amount = searchParams.get('amount')?.split('?')[0];
    const message = searchParams.get('message');
    const reference = searchParams.get('reference');
    const label = searchParams.get('amount')?.split('?')[1];

    return {
        reference,
        amount,
        label,
        message,
    }
}