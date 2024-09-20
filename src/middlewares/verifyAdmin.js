const verifyViewer = async (req, res, params) => {
    if(!req.roles)
        throw new Error("No role Provided");
    if(!["admin"].includes(req.role))
        throw new Error("Unauthorized");
}

module.exports = {verifyViewer}
