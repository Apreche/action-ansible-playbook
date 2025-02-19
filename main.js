const core = require('@actions/core')
const exec = require('@actions/exec')
const yaml = require('yaml')
const fs = require('fs')
const os = require('os')

async function main() {
    try {
        const playbook = core.getInput("playbook", { required: true })
        const requirements = core.getInput("requirements")
        const directory = core.getInput("directory")
        const inventory = core.getInput("inventory")
        const vaultPassword = core.getInput("vault_password")
        const options = core.getInput("options")

        let cmd = ["ansible-playbook", playbook]

        if (options) {
            cmd.push(options.replace(/\n/g, " "))
        }

        if (directory) {
            process.chdir(directory)
            core.saveState("directory", directory)
        }

        if (requirements) {
            const requirementsContent = fs.readFileSync(requirements, 'utf8')
            const requirementsObject = yaml.parse(requirementsContent)

            if (Array.isArray(requirementsObject)) {
                await exec.exec("ansible-galaxy", ["install", "-r", requirements])
            } else {
                if (requirementsObject.roles)
                    await exec.exec("ansible-galaxy", ["role", "install", "-r", requirements])
                if (requirementsObject.collections)
                    await exec.exec("ansible-galaxy", ["collection", "install", "-r", requirements])
            }
        }

        if (inventory) {
            const inventoryFile = ".ansible_inventory"
            fs.writeFileSync(inventoryFile, inventory, { mode: 0600 })
            core.saveState("inventoryFile", inventoryFile)
            cmd.push("--inventory-file")
            cmd.push(inventoryFile)
        }

        if (vaultPassword) {
            const vaultPasswordFile = ".ansible_vault_password"
            fs.writeFileSync(vaultPasswordFile, vaultPassword, { mode: 0600 })
            core.saveState("vaultPasswordFile", vaultPasswordFile)
            cmd.push("--vault-password-file")
            cmd.push(vaultPasswordFile)
        }

        process.env.ANSIBLE_HOST_KEY_CHECKING = "True"
        process.env.ANSIBLE_FORCE_COLOR = "True"

        await exec.exec(cmd.join(' '))

    } catch (error) {
        core.setFailed(error.message)
    }
}

main()
