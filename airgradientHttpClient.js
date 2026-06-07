// GJS adapter for the AirGradient local-server HTTP boundary.
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Soup from "gi://Soup";

import { parseAirMeasurements } from "./airgradientSensors.js";
import { endpointForServerUrl } from "./airgradientPresentation.js";

const REQUEST_TIMEOUT_SECONDS = 8;

export class AirGradientHttpClient {
    constructor(extensionMetadata) {
        this._session = new Soup.Session({
            timeout: REQUEST_TIMEOUT_SECONDS,
            user_agent: `${extensionMetadata.uuid}/${extensionMetadata.version ?? "0.2.0"}`,
        });
    }

    destroy() {
        this._session.abort();
    }

    cancel(cancellable) {
        cancellable?.cancel();
    }

    fetchCurrentMeasurements(serverUrl, cancellable, callback) {
        const message = Soup.Message.new(
            "GET",
            endpointForServerUrl(serverUrl),
        );

        if (!message) {
            callback(new Error("Invalid AirGradient server URL."), null);
            return;
        }

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            cancellable,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    this._throwForHttpError(message);

                    const payload = new TextDecoder().decode(bytes.toArray());
                    callback(null, parseAirMeasurements(payload));
                } catch (error) {
                    if (isCancelledError(error)) {
                        callback(null, null);
                        return;
                    }

                    callback(error, null);
                }
            },
        );
    }

    createCancellable() {
        return new Gio.Cancellable();
    }

    _throwForHttpError(message) {
        const statusCode = message.get_status?.() ?? message.status_code ?? 200;
        if (statusCode < 200 || statusCode >= 300)
            throw new Error(`Server returned HTTP ${statusCode}`);
    }
}

function isCancelledError(error) {
    return (
        typeof error.matches === "function" &&
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
    );
}
